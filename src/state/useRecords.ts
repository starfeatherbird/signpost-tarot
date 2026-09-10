import { useCallback, useState } from 'react';
import type { ConsultationRecord } from '../domain/types';
import {
  clearAllRecords,
  deleteRecord as deleteFrom,
  loadRecords,
  patchRecord,
  saveRecords,
  updateMemo as updateMemoIn,
  upsertRecord,
} from '../services/records';
import type { StorageResult } from '../services/storage';

type UpsertDraft = Parameters<typeof upsertRecord>[1];

/**
 * 기록 목록 상태 + 저장소 연동 훅.
 * 모든 쓰기 함수는 StorageResult 를 돌려주므로 화면에서 실패를 정직하게 알릴 수 있습니다.
 */
export function useRecords() {
  const [records, setRecords] = useState<ConsultationRecord[]>(() => loadRecords());

  const commit = useCallback((next: ConsultationRecord[]): StorageResult => {
    const result = saveRecords(next);
    if (result.ok) setRecords(next);
    return result;
  }, []);

  const save = useCallback(
    (draft: UpsertDraft): StorageResult & { record?: ConsultationRecord; isNew?: boolean } => {
      const { records: next, record, isNew } = upsertRecord(records, draft);
      const result = commit(next);
      return result.ok ? { ok: true, record, isNew } : result;
    },
    [records, commit],
  );

  const updateMemo = useCallback(
    (id: string, memo: string) => commit(updateMemoIn(records, id, memo)),
    [records, commit],
  );

  const update = useCallback(
    (id: string, patch: Parameters<typeof patchRecord>[2]) => commit(patchRecord(records, id, patch)),
    [records, commit],
  );

  const remove = useCallback((id: string) => commit(deleteFrom(records, id)), [records, commit]);

  const clearAll = useCallback((): StorageResult => {
    const result = clearAllRecords();
    if (result.ok) setRecords([]);
    return result;
  }, []);

  return { records, save, updateMemo, update, remove, clearAll };
}

export type RecordsApi = ReturnType<typeof useRecords>;
