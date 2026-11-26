import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { z } from 'zod';
import type { AuthUser } from '../auth/auth-user.js';
import { OptionalAuth, OptionalUser } from '../auth/auth.decorators.js';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import {
  INQUIRY_CONTENT_MAX,
  INQUIRY_CONTENT_MIN,
  INQUIRY_TYPES,
  InquiriesService,
} from './inquiries.service.js';

const createInquirySchema = z.object(
  {
    type: z.enum(INQUIRY_TYPES, {
      error: '지원하지 않는 문의 종류예요',
    }),
    email: z
      .string({ error: '답변 받을 이메일을 적어 주세요' })
      .trim()
      .max(254, '이메일이 너무 길어요')
      .pipe(z.email('이메일 형식을 확인해 주세요')),
    content: z
      .string({ error: '문의 내용을 적어 주세요' })
      .trim()
      .min(
        INQUIRY_CONTENT_MIN,
        `문의 내용은 ${INQUIRY_CONTENT_MIN}자 이상 적어 주세요`,
      )
      .max(
        INQUIRY_CONTENT_MAX,
        `문의 내용은 ${INQUIRY_CONTENT_MAX}자 이내로 적어 주세요`,
      ),
  },
  { error: '본문은 JSON 객체여야 해요' },
);

@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  /**
   * POST /inquiries — 문의하기 접수 후 개발자 메일로 전달.
   * 비로그인 사용자도 보낼 수 있고(로그인 시 회원 ID 참고 표기), 스팸 방지를 위해 IP당 1분 5회로 제한한다.
   */
  @Post()
  @OptionalAuth()
  @HttpCode(HttpStatus.CREATED)
  @RateLimit(5, 60_000)
  create(
    @Body({ schema: createInquirySchema })
    body: z.infer<typeof createInquirySchema>,
    @OptionalUser() user: AuthUser | null,
  ) {
    return this.inquiriesService.send(body, user);
  }
}
