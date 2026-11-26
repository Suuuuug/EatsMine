import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '../auth/auth-user.js';
import { AppException } from '../common/app-exception.js';
import type { Env } from '../config/env.js';

export const INQUIRY_TYPES = ['service', 'error', 'privacy', 'etc'] as const;
export type InquiryType = (typeof INQUIRY_TYPES)[number];

export const INQUIRY_CONTENT_MIN = 10;
export const INQUIRY_CONTENT_MAX = 1000;

export const INQUIRY_TYPE_LABELS: Readonly<Record<InquiryType, string>> = {
  service: '서비스 이용',
  error: '오류 신고',
  privacy: '개인정보',
  etc: '기타',
};

export type InquiryInput = {
  type: InquiryType;
  email: string;
  content: string;
};

export type BuiltInquiryEmail = {
  subject: string;
  text: string;
  replyTo: string;
};

const RESEND_EMAILS_URL = 'https://api.resend.com/emails';
const SUBJECT_PREVIEW_MAX = 40;

const KST_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** 개발자 메일함에서 바로 확인하고 Reply-To로 답장할 수 있는 평문 메일을 만든다. */
export function buildInquiryEmail(
  input: InquiryInput,
  user: AuthUser | null = null,
  now: Date = new Date(),
): BuiltInquiryEmail {
  const label = INQUIRY_TYPE_LABELS[input.type];
  // 제목에 개행·연속 공백이 섞이지 않도록 정리 (헤더 인젝션 방지)
  const flatContent = input.content.replace(/\s+/g, ' ').trim();
  const preview =
    flatContent.length > SUBJECT_PREVIEW_MAX
      ? `${flatContent.slice(0, SUBJECT_PREVIEW_MAX)}…`
      : flatContent;
  const subject = `[EatsMine 문의 · ${label}] ${preview}`;

  const memberLine = user ? `로그인 회원 (${user.id})` : '비로그인';
  const text = [
    '[EatsMine 문의 접수]',
    `- 문의 종류: ${label} (${input.type})`,
    `- 답변 받을 이메일: ${input.email}`,
    `- 회원 여부: ${memberLine}`,
    `- 접수 시각: ${KST_FORMATTER.format(now)} KST`,
    '',
    '--- 문의 내용 ---',
    input.content,
  ].join('\n');

  return {
    subject,
    text,
    replyTo: input.email,
  };
}

@Injectable()
export class InquiriesService {
  private readonly logger = new Logger(InquiriesService.name);
  private readonly apiKey: string | undefined;
  private readonly toEmails: readonly string[];
  private readonly fromEmail: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService<Env, true>) {
    this.apiKey = config.get('RESEND_API_KEY', { infer: true });
    this.toEmails = config.get('INQUIRY_TO_EMAIL', { infer: true }) ?? [];
    this.fromEmail = config.get('INQUIRY_FROM_EMAIL', { infer: true });
    this.timeoutMs = config.get('INQUIRY_TIMEOUT_MS', { infer: true });
  }

  /**
   * 문의 내용을 DB에 남기지 않고 Resend HTTP API로 개발자 메일에 바로 전달한다.
   * 환경변수 미설정 시 503(SERVICE_MISCONFIGURED), 외부 메일 전송 실패 시 502(INQUIRY_UNAVAILABLE).
   */
  async send(
    input: InquiryInput,
    user: AuthUser | null = null,
  ): Promise<{ ok: true }> {
    if (!this.apiKey || this.toEmails.length === 0) {
      this.logger.warn(
        '문의하기 메일 설정 누락 (RESEND_API_KEY 또는 INQUIRY_TO_EMAIL)',
      );
      throw new AppException(
        'SERVICE_MISCONFIGURED',
        '문의 창구를 아직 열지 못했어요. 잠시 후 다시 시도해 주세요.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const email = buildInquiryEmail(input, user);

    let res: Response;
    try {
      res = await fetch(RESEND_EMAILS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [...this.toEmails],
          reply_to: email.replyTo,
          subject: email.subject,
          text: email.text,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (e) {
      this.logger.warn(
        `문의 메일 전송 호출 실패: ${(e as Error).name} ${(e as Error).message}`,
      );
      throw new AppException(
        'INQUIRY_UNAVAILABLE',
        '문의를 보내지 못했어요. 잠시 후 다시 시도해 주세요.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (!res.ok) {
      this.logger.warn(`문의 메일 전송 응답 오류: HTTP ${res.status}`);
      throw new AppException(
        'INQUIRY_UNAVAILABLE',
        '문의를 보내지 못했어요. 잠시 후 다시 시도해 주세요.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return { ok: true };
  }
}
