import { REFLECTION_AFTER_DAYS } from '../config/appConfig';
import type { ConsultationRecord, ReadingResult } from '../domain/types';

/**
 * "이후 돌아보기" 상태.
 * - none: 결과에 돌아볼 질문이 없음 (예전 기록)
 * - waiting: 질문은 있지만 아직 돌아볼 때가 되지 않음
 * - due: 저장 뒤 REFLECTION_AFTER_DAYS 가 지났고 아직 답하지 않음
 * - done: 답(이후 상황 메모)을 남김
 */
export type ReflectionStatus = 'none' | 'waiting' | 'due' | 'done';

/** 기록에서 돌아볼 질문을 고릅니다. 심층 결과가 있으면 그쪽을 우선합니다. */
export function getReflectionQuestion(record: Pick<ConsultationRecord, 'result' | 'deepResult'>): string | null {
  const fromDeep = record.deepResult?.reflectionQuestion?.trim();
  const fromBasic = record.result?.reflectionQuestion?.trim();
  return fromDeep || fromBasic || null;
}

/** 기록의 상징 스톤. 심층 결과가 있으면 그쪽을 우선합니다. */
export function getRecordStone(record: Pick<ConsultationRecord, 'result' | 'deepResult'>): ReadingResult['stone'] | undefined {
  return record.deepResult?.stone ?? record.result?.stone;
}

/** 돌아볼 때가 된 기록만 최신순으로 */
export function getDueRecords<T extends Pick<ConsultationRecord, 'result' | 'deepResult' | 'createdAt' | 'followUpMemo'>>(records: T[], now: Date = new Date()): T[] {
  return records
    .filter((r) => getReflectionStatus(r, now) === 'due')
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function getReflectionStatus(
  record: Pick<ConsultationRecord, 'result' | 'deepResult' | 'createdAt' | 'followUpMemo'>,
  now: Date = new Date(),
): ReflectionStatus {
  if (!getReflectionQuestion(record)) return 'none';
  if (record.followUpMemo.trim()) return 'done';
  const dueAt = Date.parse(record.createdAt) + REFLECTION_AFTER_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() >= dueAt ? 'due' : 'waiting';
}
