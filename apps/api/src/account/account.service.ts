import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '../auth/auth-user.js';
import { AppException } from '../common/app-exception.js';
import type { Env } from '../config/env.js';
import { PhotoStorage } from '../reviews/photo-storage.js';

/*
 * 회원 탈퇴.
 * Supabase 계정(auth.users)을 지우면 DB는 연쇄 삭제로 정리된다:
 *   auth.users → profiles(수동 마이그레이션 FK) → reviews·review_photos·user_region_visits·user_food_collection·share_links
 * 매장(restaurants)은 다른 리뷰와 함께 쓰는 공용 정보라 남고, 잇플 이동 기록·문의는 사용자 ID를 저장하지 않는다.
 * DB 밖에 남는 것은 Storage의 사진 파일뿐이라 따로 지운다.
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  private readonly authAdminBase: string;
  private readonly key: string | undefined;

  constructor(
    config: ConfigService<Env, true>,
    private readonly photoStorage: PhotoStorage,
  ) {
    this.authAdminBase = `${config.get('SUPABASE_URL', { infer: true })}/auth/v1/admin/users`;
    this.key = config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true });
  }

  /**
   * 1) 지울 사진 파일 목록을 먼저 모은다(계정을 지운 뒤에는 누구 파일인지 다시 찾을 수 없다)
   * 2) 계정을 지운다 — 실패하면 아무것도 지우지 않고 오류
   * 3) 사진 파일을 지운다 — 실패해도 탈퇴는 끝난 것으로 본다(남은 파일은 나중에 정리)
   */
  async deleteAccount(user: AuthUser): Promise<void> {
    if (!this.key) {
      throw new AppException(
        'SERVICE_MISCONFIGURED',
        '지금은 탈퇴를 처리할 수 없어요. 잠시 후 다시 시도해 주세요.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    let photoPaths: string[] = [];
    try {
      photoPaths = await this.photoStorage.listUserFolder(user.id);
    } catch (e) {
      // 목록을 못 읽어도 탈퇴는 진행한다(파일은 폴더 단위로 나중에 정리할 수 있다)
      this.logger.warn(
        `탈퇴 사진 목록 실패(${user.id}): ${(e as Error).message}`,
      );
    }

    await this.deleteAuthUser(user.id);

    if (photoPaths.length) await this.photoStorage.remove(photoPaths);
  }

  private async deleteAuthUser(userId: string): Promise<void> {
    let res: Response;
    try {
      res = await fetch(`${this.authAdminBase}/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.key}`, apikey: this.key! },
        signal: AbortSignal.timeout(8000),
      });
    } catch (e) {
      this.logger.warn(`탈퇴 계정 삭제 호출 실패: ${(e as Error).name}`);
      throw failed();
    }
    // 이미 지워진 계정(404)은 탈퇴가 끝난 것으로 본다
    if (res.ok || res.status === HttpStatus.NOT_FOUND) return;
    this.logger.warn(`탈퇴 계정 삭제 실패: ${res.status}`);
    throw failed();
  }
}

function failed() {
  return new AppException(
    'INTERNAL_ERROR',
    '탈퇴를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
    HttpStatus.BAD_GATEWAY,
  );
}
