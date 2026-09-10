import { useCallback, useState } from 'react';
import type { ConsultationRecord } from '../domain/types';
import { APP_NAME } from '../config/appConfig';
import {
  buildExport,
  clearAllRecords,
  mergeRecords,
  parseImport,
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

  /** 기록 전체를 JSON 문자열로 */
  const exportJson = useCallback(() => JSON.stringify(buildExport(records, APP_NAME), null, 2), [records]);

  /** 파일 내용을 읽어 합칩니다. 형식 오류는 ok:false 로 알립니다. */
  const importFromText = useCallback(
    (text: string): StorageResult & { added?: number; updated?: number } => {
      let incoming;
      try {
        incoming = parseImport(text);
      } catch (err) {
        return { ok: false, reason: err instanceof Error ? err.message : '기록 파일 형식이 아니에요.' };
      }
      const merged = mergeRecords(records, incoming);
      const result = commit(merged.records);
      return result.ok ? { ok: true, added: merged.added, updated: merged.updated } : result;
    },
    [records, commit],
  );

  const clearAll = useCallback((): StorageResult => {
    const result = clearAllRecords();
    if (result.ok) setRecords([]);
    return result;
  }, []);

  return { records, save, updateMemo, update, remove, clearAll, exportJson, importFromText };
}

export type RecordsApi = ReturnType<typeof useRecords>;
