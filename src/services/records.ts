import { STORAGE_KEYS } from '../config/appConfig';
import type { ConsultationRecord } from '../domain/types';
import { readJson, writeJson, removeKey, type StorageResult } from './storage';

/**
 * 상담 기록 저장소. 지금은 localStorage 를 사용하지만,
 * 나중에 계정 동기화를 붙일 때 이 파일의 함수들만 서버 호출로 바꾸면 됩니다.
 */

function isRecordLike(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  const hasResult = (!!r.result && typeof r.result === 'object') || (!!r.deepResult && typeof r.deepResult === 'object');
  return (
    typeof r.id === 'string' &&
    typeof r.consultationId === 'string' &&
    typeof r.createdAt === 'string' &&
    typeof r.concern === 'string' &&
    Array.isArray(r.answers) &&
    Array.isArray(r.cards) &&
    hasResult
  );
}

/** 예전 형식(상품 구분 전) 기록도 읽을 수 있게 기본값을 채웁니다. */
function normalizeRecord(raw: Record<string, unknown>): ConsultationRecord {
  const result = (raw.result as ConsultationRecord['result']) ?? null;
  const deepResult = (raw.deepResult as ConsultationRecord['deepResult']) ?? null;
  return {
    id: raw.id as string,
    consultationId: raw.consultationId as string,
    createdAt: raw.createdAt as string,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : (raw.createdAt as string),
    plan: raw.plan === 'deep' ? 'deep' : 'basic',
    concern: raw.concern as string,
    answers: raw.answers as ConsultationRecord['answers'],
    deepAnswers: Array.isArray(raw.deepAnswers) ? (raw.deepAnswers as ConsultationRecord['deepAnswers']) : [],
    cards: raw.cards as ConsultationRecord['cards'],
    supplement: typeof raw.supplement === 'string' ? raw.supplement : undefined,
    result,
    deepResult,
    followUps: Array.isArray(raw.followUps) ? (raw.followUps as ConsultationRecord['followUps']) : [],
    actionChecks: Array.isArray(raw.actionChecks) ? (raw.actionChecks as string[]).filter((v) => typeof v === 'string') : [],
    isSample: typeof raw.isSample === 'boolean' ? raw.isSample : !!(result?.isSample || deepResult?.isSample),
    followUpMemo: typeof raw.followUpMemo === 'string' ? raw.followUpMemo : '',
  };
}

export function loadRecords(): ConsultationRecord[] {
  const list = readJson(STORAGE_KEYS.records, (v): v is unknown[] => Array.isArray(v));
  if (!list) return [];
  // 목록 일부가 손상됐더라도 살릴 수 있는 항목은 살립니다.
  return list.filter(isRecordLike).map(normalizeRecord);
}

export function saveRecords(records: ConsultationRecord[]): StorageResult {
  return writeJson(STORAGE_KEYS.records, records);
}

export type RecordDraft = Omit<ConsultationRecord, 'id' | 'createdAt' | 'updatedAt' | 'followUpMemo'>;

/**
 * consultationId 가 같은 기록이 있으면 갱신하고, 없으면 새로 추가합니다.
 * 저장 버튼을 여러 번 눌러도 같은 상담이 중복되지 않게 하는 핵심 규칙입니다.
 */
export function upsertRecord(
  records: ConsultationRecord[],
  draft: RecordDraft,
  now: string = new Date().toISOString(),
): { records: ConsultationRecord[]; record: ConsultationRecord; isNew: boolean } {
  const existing = records.find((r) => r.consultationId === draft.consultationId);
  if (existing) {
    const updated: ConsultationRecord = { ...existing, ...draft, updatedAt: now };
    return {
      records: records.map((r) => (r.id === existing.id ? updated : r)),
      record: updated,
      isNew: false,
    };
  }
  const created: ConsultationRecord = {
    ...draft,
    id: createId(),
    createdAt: now,
    updatedAt: now,
    followUpMemo: '',
  };
  return { records: [created, ...records], record: created, isNew: true };
}

export function updateMemo(records: ConsultationRecord[], id: string, memo: string): ConsultationRecord[] {
  const now = new Date().toISOString();
  return records.map((r) => (r.id === id ? { ...r, followUpMemo: memo, updatedAt: now } : r));
}

/** 기록의 일부 필드를 갱신합니다 (예: 행동 체크 상태). */
export function patchRecord(records: ConsultationRecord[], id: string, patch: Partial<Pick<ConsultationRecord, 'actionChecks' | 'followUpMemo'>>): ConsultationRecord[] {
  const now = new Date().toISOString();
  return records.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: now } : r));
}

export function deleteRecord(records: ConsultationRecord[], id: string): ConsultationRecord[] {
  return records.filter((r) => r.id !== id);
}

export function clearAllRecords(): StorageResult {
  return removeKey(STORAGE_KEYS.records);
}

// ---- 내보내기 / 가져오기 (브라우저에만 있는 기록의 백업·이동용) ----

export const EXPORT_FORMAT = 1;

export interface RecordsExport {
  app: string;
  format: number;
  exportedAt: string;
  records: ConsultationRecord[];
}

export function buildExport(records: ConsultationRecord[], appName: string): RecordsExport {
  return { app: appName, format: EXPORT_FORMAT, exportedAt: new Date().toISOString(), records };
}

/** 내보낸 파일 내용을 기록 목록으로 읽습니다. 형식이 아니면 예외를 던집니다. */
export function parseImport(text: string): ConsultationRecord[] {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('기록 파일 형식이 아니에요.');
  }
  const list = Array.isArray(value) ? value : (value as { records?: unknown })?.records;
  if (!Array.isArray(list)) throw new Error('기록 파일 형식이 아니에요.');
  const records = list.filter(isRecordLike).map(normalizeRecord);
  if (records.length === 0) throw new Error('파일 안에 읽을 수 있는 기록이 없어요.');
  return records;
}

/**
 * 가져온 기록을 기존 목록에 합칩니다. 같은 id 는 더 최근에 수정된 쪽을 남깁니다.
 */
export function mergeRecords(existing: ConsultationRecord[], incoming: ConsultationRecord[]): { records: ConsultationRecord[]; added: number; updated: number } {
  const byId = new Map(existing.map((r) => [r.id, r]));
  let added = 0;
  let updated = 0;
  for (const r of incoming) {
    const current = byId.get(r.id);
    if (!current) {
      byId.set(r.id, r);
      added += 1;
    } else if (Date.parse(r.updatedAt) > Date.parse(current.updatedAt)) {
      byId.set(r.id, r);
      updated += 1;
    }
  }
  const records = [...byId.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return { records, added, updated };
}

// ---- 서버 동기화 병합 (로그인 시) ----

export interface RemoteRowLike {
  id: string;
  updated_at: string;
  deleted_at: string | null;
  data: unknown;
}

/**
 * 서버에서 받은 행과 기기의 기록을 합칩니다.
 * - 같은 id 는 더 최근에 수정된 쪽이 남습니다.
 * - 서버의 삭제 표시(deleted_at)가 기기 수정보다 최근이면 기기에서도 지웁니다. 기기 쪽이 더 최근이면 되살려 다시 올립니다.
 * - 기기에만 있거나 기기가 더 최근인 기록은 toUpload 로 돌려줘 서버에 올립니다.
 */
export function mergeRemote(local: ConsultationRecord[], remote: RemoteRowLike[]): { records: ConsultationRecord[]; toUpload: ConsultationRecord[] } {
  const byId = new Map(local.map((r) => [r.id, r]));
  const toUpload: ConsultationRecord[] = [];
  const seen = new Set<string>();
  for (const row of remote) {
    seen.add(row.id);
    const mine = byId.get(row.id);
    const remoteTime = Date.parse(row.updated_at);
    if (row.deleted_at) {
      if (mine && Date.parse(mine.updatedAt) > Date.parse(row.deleted_at)) toUpload.push(mine); // 삭제 뒤에 기기에서 고침 → 되살림
      else byId.delete(row.id);
      continue;
    }
    if (!isRecordLike(row.data)) continue; // 읽을 수 없는 행은 무시
    const theirs = normalizeRecord(row.data);
    if (!mine) byId.set(row.id, theirs);
    else if (Date.parse(mine.updatedAt) > remoteTime) toUpload.push(mine);
    else if (remoteTime > Date.parse(mine.updatedAt)) byId.set(row.id, theirs);
  }
  for (const r of local) if (!seen.has(r.id)) toUpload.push(r);
  const records = [...byId.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return { records, toUpload };
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
