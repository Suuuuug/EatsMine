import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, count, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { AuthUser } from '../auth/auth-user.js';
import { AppException } from '../common/app-exception.js';
import {
  foods,
  profiles,
  regions,
  restaurants,
  reviewPhotos,
  reviews,
  userFoodCollection,
  userRegionVisits,
} from '../db/schema.js';
import { EatplClient } from '../eatpl/eatpl.client.js';
import { merchantIdFromUrl } from '../eatpl/eatpl.normalizer.js';
import { ProfilesService } from '../profiles/profiles.service.js';
import {
  type RankKey,
  rankForReviewCount,
  rankLabel,
} from '../profiles/ranks.js';
import { AddressMatcher } from '../regions/address-matcher.js';
import {
  isOwnPhotoPath,
  MAX_PHOTO_BYTES,
  newPhotoPath,
  PHOTO_CONTENT_TYPES,
  type PhotoContentType,
  PhotoStorage,
} from './photo-storage.js';
import { roundAverage } from './review-summary.service.js';

type Db = NodePgDatabase;
/** drizzle 트랜잭션 객체 (db와 같은 쿼리 API) */
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export type CreateReviewInput = {
  merUrl: string;
  restaurantName: string;
  rating: number;
  content?: string;
  visitedAt?: string;
  foodId?: number;
  visibility: 'private' | 'public';
  photoPaths?: string[];
};

export type UpdateReviewInput = Partial<{
  rating: number;
  content: string | null;
  visitedAt: string | null;
  foodId: number | null;
  visibility: 'private' | 'public';
  photoPaths: string[];
}>;

/** 리뷰 사진: path는 수정할 때 다시 보내는 값(본인 리뷰에서만), url은 1시간 유효한 서명 URL */
export type ReviewPhotoDto = { path: string; url: string };

export type ReviewDto = {
  id: number;
  restaurant: {
    id: string;
    name: string;
    address: string;
    merUrl: string;
    regionCode: string | null;
    regionName: string | null;
  };
  food: { id: number; name: string } | null;
  rating: number;
  content: string | null;
  visitedAt: string | null;
  visibility: 'private' | 'public';
  photos: ReviewPhotoDto[];
  createdAt: string;
  updatedAt: string;
};

/** 매장 공개 리뷰 (GET /restaurants/:id/reviews). 작성자는 닉네임·등급·프로필 사진만 노출 */
export type PublicReviewDto = {
  id: number;
  author: {
    nickname: string;
    rank: RankKey;
    rankLabel: string;
    avatarUrl: string | null;
  };
  food: { id: number; name: string } | null;
  rating: number;
  content: string | null;
  visitedAt: string | null;
  /** 서명된 사진 URL(1시간 유효). 저장 경로는 남의 리뷰라 내보내지 않는다 */
  photos: { url: string }[];
  createdAt: string;
  updatedAt: string;
};

export type RestaurantReviewsDto = {
  restaurantId: string;
  /** 공개 리뷰가 없으면 null (0점으로 표시하지 않도록) */
  summary: { average: number; count: number } | null;
  items: PublicReviewDto[];
};

export const PUBLIC_REVIEW_LIMIT = 50;
export const MAX_REVIEW_PHOTOS = 4;

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectDrizzle() private readonly db: Db,
    private readonly eatpl: EatplClient,
    private readonly addressMatcher: AddressMatcher,
    private readonly profiles: ProfilesService,
    private readonly photoStorage: PhotoStorage,
  ) {}

  /** 리뷰 사진 업로드용 서명 URL과 경로(브라우저가 uploadUrl로 직접 올린다) */
  async createPhotoUpload(user: AuthUser, contentType: PhotoContentType) {
    const path = newPhotoPath(user.id, contentType);
    const uploadUrl = await this.photoStorage.createUploadUrl(path);
    return { path, uploadUrl, contentType, maxBytes: MAX_PHOTO_BYTES };
  }

  /**
   * 리뷰 작성 (D8). 한 트랜잭션: 매장 저장/갱신 → 리뷰 → 영토 → (음식 선택 시) 도감 → 등급 재계산
   * 매장 정보는 프론트 값을 믿지 않고 잇플에 다시 조회해 merUrl이 일치하는 매장만 저장한다 (D10).
   */
  async create(user: AuthUser, input: CreateReviewInput): Promise<ReviewDto> {
    const restaurantId = merchantIdFromUrl(input.merUrl);
    if (!restaurantId) {
      throw new AppException(
        'BAD_REQUEST',
        '잇플 상세 링크(merUrl)가 올바르지 않아요.',
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.profiles.getOrCreate(user); // reviews.user_id FK
    if (input.foodId !== undefined) await this.assertFoodExists(input.foodId);
    await this.assertNotReviewed(user.id, restaurantId);
    const photoPaths = await this.validatePhotos(
      user.id,
      input.photoPaths ?? [],
    );

    const candidates = await this.eatpl.search({
      merchantName: input.restaurantName,
    });
    const place = candidates.find((p) => p.id === restaurantId);
    if (!place) {
      throw new AppException(
        'NOT_FOUND',
        '잇플에서 매장을 확인할 수 없어요.',
        HttpStatus.NOT_FOUND,
      );
    }
    const regionCode = await this.addressMatcher.match(place.address);

    let reviewId: number;
    try {
      reviewId = await this.db.transaction(async (tx) => {
        const restaurant = {
          merUrl: place.merUrl,
          name: place.name,
          address: place.address,
          genre: place.genre,
          regionCode,
          lat: place.lat,
          lng: place.lng,
        };
        await tx
          .insert(restaurants)
          .values({ id: place.id, ...restaurant })
          .onConflictDoUpdate({
            target: restaurants.id,
            set: { ...restaurant, updatedAt: sql`now()` },
          });

        const [review] = await tx
          .insert(reviews)
          .values({
            userId: user.id,
            restaurantId: place.id,
            foodId: input.foodId ?? null,
            rating: input.rating,
            content: input.content ?? null,
            visitedAt: input.visitedAt ?? null,
            visibility: input.visibility,
          })
          .returning({ id: reviews.id });

        await this.insertPhotos(tx, user.id, review.id, photoPaths);
        if (regionCode) {
          await tx
            .insert(userRegionVisits)
            .values({ userId: user.id, regionCode, sourceReviewId: review.id })
            .onConflictDoNothing();
        }
        if (input.foodId !== undefined) {
          await tx
            .insert(userFoodCollection)
            .values({
              userId: user.id,
              foodId: input.foodId,
              sourceReviewId: review.id,
            })
            .onConflictDoNothing();
        }
        await this.recomputeRank(tx, user.id);
        return review.id;
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw alreadyReviewed(); // 동시 요청
      throw e;
    }
    return this.getDto(reviewId);
  }

  /** 본인 리뷰 수정. 음식을 바꾸면 새 음식 수집, 예전 음식은 뒷받침하는 리뷰가 없으면 회수 */
  async update(
    user: AuthUser,
    id: number,
    input: UpdateReviewInput,
  ): Promise<ReviewDto> {
    const current = await this.getOwned(user, id);
    if (input.foodId != null) await this.assertFoodExists(input.foodId);
    const { photoPaths: nextPaths, ...fields } = input;
    const before = nextPaths !== undefined ? await this.photoPathsOf(id) : [];
    const photoPaths =
      nextPaths !== undefined
        ? await this.validatePhotos(user.id, nextPaths, id)
        : undefined;

    await this.db.transaction(async (tx) => {
      await tx
        .update(reviews)
        .set({ ...fields, updatedAt: sql`now()` })
        .where(eq(reviews.id, id));
      if (photoPaths !== undefined) {
        await tx.delete(reviewPhotos).where(eq(reviewPhotos.reviewId, id));
        await this.insertPhotos(tx, user.id, id, photoPaths);
      }

      const foodChanged =
        input.foodId !== undefined && input.foodId !== current.foodId;
      if (foodChanged && input.foodId != null) {
        await tx
          .insert(userFoodCollection)
          .values({ userId: user.id, foodId: input.foodId, sourceReviewId: id })
          .onConflictDoNothing();
      }
      if (foodChanged && current.foodId != null)
        await this.reclaimFood(tx, user.id, current.foodId);
    });
    // 목록에서 빠진 사진은 저장소에서도 지운다(실패해도 수정은 끝난 상태)
    if (photoPaths !== undefined)
      await this.photoStorage.remove(
        before.filter((p) => !photoPaths.includes(p)),
      );
    return this.getDto(id);
  }

  /** 본인 리뷰 삭제. 그 지역·음식을 뒷받침하는 다른 리뷰가 없으면 영토·도감 회수, 등급 재계산 */
  async remove(user: AuthUser, id: number): Promise<void> {
    const current = await this.getOwned(user, id);
    const paths = await this.photoPathsOf(id);
    await this.db.transaction(async (tx) => {
      await tx.delete(reviews).where(eq(reviews.id, id)); // review_photos 행은 함께 지워진다
      if (current.regionCode)
        await this.reclaimRegion(tx, user.id, current.regionCode);
      if (current.foodId != null)
        await this.reclaimFood(tx, user.id, current.foodId);
      await this.recomputeRank(tx, user.id);
    });
    await this.photoStorage.remove(paths);
  }

  async listMine(userId: string): Promise<ReviewDto[]> {
    const rows = await this.dtoQuery()
      .where(eq(reviews.userId, userId))
      .orderBy(desc(reviews.createdAt))
      .limit(200);
    const photos = await this.signedPhotos(rows.map((r) => r.id));
    return rows.map((r) => toDto(r, photos.get(r.id) ?? []));
  }

  /**
   * 매장의 공개(public) 리뷰 — 누구나 조회 (지도 카드·리뷰 시트).
   * 집계는 공개 리뷰 전체, 목록은 최신순 PUBLIC_REVIEW_LIMIT개. 매장이 아직 저장되지 않았으면 빈 결과.
   */
  async listPublicForRestaurant(
    restaurantId: string,
  ): Promise<RestaurantReviewsDto> {
    const isPublic = and(
      eq(reviews.restaurantId, restaurantId),
      eq(reviews.visibility, 'public'),
    );
    const [rows, [agg]] = await Promise.all([
      this.db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          content: reviews.content,
          visitedAt: reviews.visitedAt,
          createdAt: reviews.createdAt,
          updatedAt: reviews.updatedAt,
          nickname: profiles.nickname,
          rank: profiles.rank,
          avatarUrl: profiles.avatarUrl,
          foodId: foods.id,
          foodName: foods.name,
        })
        .from(reviews)
        .innerJoin(profiles, eq(profiles.id, reviews.userId))
        .leftJoin(foods, eq(foods.id, reviews.foodId))
        .where(isPublic)
        .orderBy(desc(reviews.createdAt), desc(reviews.id))
        .limit(PUBLIC_REVIEW_LIMIT),
      this.db
        .select({ n: count(), avg: sql<string | null>`avg(${reviews.rating})` })
        .from(reviews)
        .where(isPublic),
    ]);
    const photos = await this.signedPhotos(rows.map((r) => r.id));
    return toRestaurantReviewsDto(restaurantId, agg, rows, photos);
  }

  // ---- 내부 ----

  /**
   * 리뷰에 붙일 사진 경로 확인: 최대 4장·중복 없음·본인 폴더({userId}/…)·실제 업로드됨·형식과 크기.
   * reviewId(수정)면 이미 그 리뷰에 붙은 사진은 다시 확인하지 않는다. 다른 리뷰에 쓰인 사진은 거부.
   */
  private async validatePhotos(
    userId: string,
    paths: readonly string[],
    reviewId?: number,
  ): Promise<string[]> {
    if (paths.length === 0) return [];
    if (
      paths.length > MAX_REVIEW_PHOTOS ||
      new Set(paths).size !== paths.length
    )
      throw badPhotos(
        `사진은 서로 다른 ${MAX_REVIEW_PHOTOS}장까지 올릴 수 있어요.`,
      );
    if (!paths.every((p) => isOwnPhotoPath(p, userId)))
      throw badPhotos('올린 사진 정보가 올바르지 않아요. 다시 올려 주세요.');

    const used = await this.db
      .select({
        path: reviewPhotos.storagePath,
        reviewId: reviewPhotos.reviewId,
      })
      .from(reviewPhotos)
      .where(
        and(
          inArray(reviewPhotos.storagePath, [...paths]),
          ...(reviewId !== undefined
            ? [ne(reviewPhotos.reviewId, reviewId)]
            : []),
        ),
      );
    if (used.length)
      throw badPhotos('다른 리뷰에 쓰인 사진이에요. 다시 올려 주세요.');

    const attached = new Set(
      reviewId !== undefined ? await this.photoPathsOf(reviewId) : [],
    );
    const fresh = paths.filter((p) => !attached.has(p));
    const infos = await Promise.all(
      fresh.map((p) => this.photoStorage.info(p)),
    );
    infos.forEach((info) => {
      if (!info)
        throw badPhotos('사진 업로드가 끝나지 않았어요. 다시 올려 주세요.');
      if (
        !(info.contentType in PHOTO_CONTENT_TYPES) ||
        info.size > MAX_PHOTO_BYTES
      )
        throw badPhotos('사진은 5MB 이하의 JPG·PNG·WEBP만 올릴 수 있어요.');
    });
    return [...paths];
  }

  private async insertPhotos(
    tx: Tx,
    userId: string,
    reviewId: number,
    paths: string[],
  ) {
    if (!paths.length) return;
    await tx.insert(reviewPhotos).values(
      paths.map((storagePath, position) => ({
        reviewId,
        userId,
        storagePath,
        position,
      })),
    );
  }

  private async photoPathsOf(reviewId: number): Promise<string[]> {
    const rows = await this.db
      .select({ path: reviewPhotos.storagePath })
      .from(reviewPhotos)
      .where(eq(reviewPhotos.reviewId, reviewId))
      .orderBy(asc(reviewPhotos.position));
    return rows.map((r) => r.path);
  }

  /** 리뷰별 사진(순서대로)과 서명 URL. 서명에 실패한 사진은 빠진다 */
  private async signedPhotos(
    reviewIds: number[],
  ): Promise<Map<number, ReviewPhotoDto[]>> {
    const result = new Map<number, ReviewPhotoDto[]>();
    if (!reviewIds.length) return result;
    const rows = await this.db
      .select({
        reviewId: reviewPhotos.reviewId,
        path: reviewPhotos.storagePath,
      })
      .from(reviewPhotos)
      .where(inArray(reviewPhotos.reviewId, reviewIds))
      .orderBy(asc(reviewPhotos.reviewId), asc(reviewPhotos.position));
    if (!rows.length) return result;
    const urls = await this.photoStorage.signedUrls(rows.map((r) => r.path));
    for (const r of rows) {
      const url = urls.get(r.path);
      if (!url) continue;
      const list = result.get(r.reviewId) ?? [];
      list.push({ path: r.path, url });
      result.set(r.reviewId, list);
    }
    return result;
  }

  private async getDto(id: number): Promise<ReviewDto> {
    const [row] = await this.dtoQuery().where(eq(reviews.id, id)).limit(1);
    const photos = await this.signedPhotos([id]);
    return toDto(row, photos.get(id) ?? []);
  }

  private dtoQuery() {
    return this.db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        content: reviews.content,
        visitedAt: reviews.visitedAt,
        visibility: reviews.visibility,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        restaurantId: restaurants.id,
        restaurantName: restaurants.name,
        address: restaurants.address,
        merUrl: restaurants.merUrl,
        regionCode: restaurants.regionCode,
        regionName: regions.fullName,
        foodId: foods.id,
        foodName: foods.name,
      })
      .from(reviews)
      .innerJoin(restaurants, eq(restaurants.id, reviews.restaurantId))
      .leftJoin(regions, eq(regions.code, restaurants.regionCode))
      .leftJoin(foods, eq(foods.id, reviews.foodId));
  }

  /** 리뷰가 없으면 404, 남의 리뷰면 403 */
  private async getOwned(user: AuthUser, id: number) {
    const [row] = await this.db
      .select({
        userId: reviews.userId,
        foodId: reviews.foodId,
        regionCode: restaurants.regionCode,
      })
      .from(reviews)
      .innerJoin(restaurants, eq(restaurants.id, reviews.restaurantId))
      .where(eq(reviews.id, id))
      .limit(1);
    if (!row)
      throw new AppException(
        'NOT_FOUND',
        '존재하지 않는 리뷰예요.',
        HttpStatus.NOT_FOUND,
      );
    if (row.userId !== user.id) {
      throw new AppException(
        'FORBIDDEN',
        '내 리뷰만 수정·삭제할 수 있어요.',
        HttpStatus.FORBIDDEN,
      );
    }
    return row;
  }

  private async assertFoodExists(foodId: number) {
    const [food] = await this.db
      .select({ id: foods.id })
      .from(foods)
      .where(eq(foods.id, foodId))
      .limit(1);
    if (!food)
      throw new AppException(
        'BAD_REQUEST',
        '존재하지 않는 음식이에요.',
        HttpStatus.BAD_REQUEST,
      );
  }

  private async assertNotReviewed(userId: string, restaurantId: string) {
    const [existing] = await this.db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(eq(reviews.userId, userId), eq(reviews.restaurantId, restaurantId)),
      )
      .limit(1);
    if (existing) throw alreadyReviewed();
  }

  /** 이 지역의 매장에 남긴 내 리뷰가 하나도 없으면 영토에서 뺀다 */
  private async reclaimRegion(tx: Tx, userId: string, regionCode: string) {
    await tx.execute(sql`
      DELETE FROM ${userRegionVisits}
      WHERE ${userRegionVisits.userId} = ${userId} AND ${userRegionVisits.regionCode} = ${regionCode}
        AND NOT EXISTS (
          SELECT 1 FROM ${reviews} JOIN ${restaurants} ON ${restaurants.id} = ${reviews.restaurantId}
          WHERE ${reviews.userId} = ${userId} AND ${restaurants.regionCode} = ${regionCode}
        )`);
  }

  /** 이 음식을 고른 내 리뷰가 하나도 없으면 도감에서 뺀다 */
  private async reclaimFood(tx: Tx, userId: string, foodId: number) {
    await tx.execute(sql`
      DELETE FROM ${userFoodCollection}
      WHERE ${userFoodCollection.userId} = ${userId} AND ${userFoodCollection.foodId} = ${foodId}
        AND NOT EXISTS (SELECT 1 FROM ${reviews} WHERE ${reviews.userId} = ${userId} AND ${reviews.foodId} = ${foodId})`);
  }

  /** 리뷰 수로 등급 재계산 (D6) */
  private async recomputeRank(tx: Tx, userId: string) {
    const [{ n }] = await tx
      .select({ n: count() })
      .from(reviews)
      .where(eq(reviews.userId, userId));
    await tx
      .update(profiles)
      .set({ rank: rankForReviewCount(n), updatedAt: sql`now()` })
      .where(eq(profiles.id, userId));
  }
}

function badPhotos(message: string) {
  return new AppException('BAD_REQUEST', message, HttpStatus.BAD_REQUEST);
}

function alreadyReviewed() {
  return new AppException(
    'CONFLICT',
    '이미 리뷰한 매장이에요. 기존 리뷰를 수정해 주세요.',
    HttpStatus.CONFLICT,
  );
}

function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return (
    err?.code === PG_UNIQUE_VIOLATION ||
    err?.cause?.code === PG_UNIQUE_VIOLATION
  );
}

type DtoRow = {
  id: number;
  rating: number;
  content: string | null;
  visitedAt: string | null;
  visibility: 'private' | 'public';
  createdAt: Date;
  updatedAt: Date;
  restaurantId: string;
  restaurantName: string;
  address: string;
  merUrl: string;
  regionCode: string | null;
  regionName: string | null;
  foodId: number | null;
  foodName: string | null;
};

export function toDto(r: DtoRow, photos: ReviewPhotoDto[] = []): ReviewDto {
  return {
    id: r.id,
    restaurant: {
      id: r.restaurantId,
      name: r.restaurantName,
      address: r.address,
      merUrl: r.merUrl,
      regionCode: r.regionCode,
      regionName: r.regionName,
    },
    food:
      r.foodId != null && r.foodName
        ? { id: r.foodId, name: r.foodName }
        : null,
    rating: r.rating,
    content: r.content,
    visitedAt: r.visitedAt,
    visibility: r.visibility,
    photos,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

type PublicReviewRow = {
  id: number;
  rating: number;
  content: string | null;
  visitedAt: string | null;
  createdAt: Date;
  updatedAt: Date;
  nickname: string;
  rank: RankKey;
  avatarUrl: string | null;
  foodId: number | null;
  foodName: string | null;
};

/** 평균은 소수 첫째 자리까지. 공개 리뷰가 없으면 summary는 null */
export function toRestaurantReviewsDto(
  restaurantId: string,
  agg: { n: number; avg: string | null } | undefined,
  rows: PublicReviewRow[],
  photos: Map<number, ReviewPhotoDto[]> = new Map(),
): RestaurantReviewsDto {
  const total = Number(agg?.n ?? 0);
  const average = agg?.avg == null ? NaN : Number(agg.avg);
  return {
    restaurantId,
    summary:
      total > 0 && Number.isFinite(average)
        ? { average: roundAverage(average), count: total }
        : null,
    items: rows.map((r) => ({
      id: r.id,
      author: {
        nickname: r.nickname,
        rank: r.rank,
        rankLabel: rankLabel(r.rank),
        avatarUrl: r.avatarUrl,
      },
      food:
        r.foodId != null && r.foodName
          ? { id: r.foodId, name: r.foodName }
          : null,
      rating: r.rating,
      content: r.content,
      visitedAt: r.visitedAt,
      photos: (photos.get(r.id) ?? []).map(({ url }) => ({ url })),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  };
}
