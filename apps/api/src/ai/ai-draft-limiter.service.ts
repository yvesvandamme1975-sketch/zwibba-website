import { Injectable } from '@nestjs/common';

import { isDraftRateExceeded, pruneDraftAttempts } from './ai-draft-guardrails';

export type AiDraftLimiterResult =
  | 'ok'
  | 'ip_rate_exceeded'
  | 'daily_cap_reached';

export type AiDraftLimiterOptions = {
  dailyLimit: number;
  now?: () => Date;
};

@Injectable()
export class AiDraftLimiterService {
  private readonly dailyLimit: number;
  private readonly now: () => Date;
  private readonly attemptsByIp = new Map<string, number[]>();
  private dailyCountDayKey = '';
  private dailyCount = 0;

  constructor({ dailyLimit, now = () => new Date() }: AiDraftLimiterOptions) {
    this.dailyLimit = dailyLimit;
    this.now = now;
  }

  evaluateDraftRequest(ip: string): AiDraftLimiterResult {
    const now = this.now();
    const nowMs = now.getTime();
    const recentAttempts = pruneDraftAttempts(
      this.attemptsByIp.get(ip) ?? [],
      nowMs,
    );

    if (recentAttempts.length === 0) {
      this.attemptsByIp.delete(ip);
    } else {
      this.attemptsByIp.set(ip, recentAttempts);
    }

    if (isDraftRateExceeded(recentAttempts.length)) {
      return 'ip_rate_exceeded';
    }

    const dayKey = now.toISOString().slice(0, 10);
    if (dayKey !== this.dailyCountDayKey) {
      this.dailyCountDayKey = dayKey;
      this.dailyCount = 0;
    }

    if (this.dailyCount >= this.dailyLimit) {
      return 'daily_cap_reached';
    }

    this.attemptsByIp.set(ip, [...recentAttempts, nowMs]);
    this.dailyCount += 1;

    return 'ok';
  }
}
