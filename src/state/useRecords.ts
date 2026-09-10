import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ConsultationRecord } from '../domain/types';
import { APP_NAME } from '../config/appConfig';
import {
  buildExport,
  clearAllRecords,
  mergeRecords,
  mergeRemote,
  parseImport,
  deleteRecord as deleteFrom,
  loadRecords,
  patchRecord,
  saveRecords,
  updateMemo as updateMemoIn,
  upsertRecord,
} from '../services/records';
import { createRemoteRecordStore, type RemoteRecordStore } from '../services/recordsRemote';
import type { StorageResult } from '../services/storage';
import { supabase } from '../services/supabase';

type UpsertDraft = Parameters<typeof upsertRecord>[1];

export type SyncState = 'off' | 'syncing' | 'synced' | 'error';

export interface SyncStatus {
  state: SyncState;
  /** 마지막으로 서버와 맞춘 시각 (ISO) */
  lastSyncAt: string | null;
  error: string | null;
}

/**
 * 기록 목록 상태 + 저장소 연동 훅.
 * - 기기(localStorage)가 기본 저장소이고, 로그인하면(userId) 서버 표와도 맞춥니다.
 * - 서버 반영은 기기 저장 뒤에 이어서 하며, 실패해도 기기 저장은 유효하고 상태(syncStatus)로만 알립니다.
 * 모든 쓰기 함수는 StorageResult 를 돌려주므로 화면에서 실패를 정직하게 알릴 수 있습니다.
 */
export function useRecords(userId: string | null = null) {
  const [records, setRecords] = useState<ConsultationRecord[]>(() => loadRecords());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: 'off', lastSyncAt: null, error: null });
  const remote = useMemo<RemoteRecordStore | null>(() => (supabase && userId ? createRemoteRecordStore(supabase, userId) : null), [userId]);
  // 최신 목록을 비동기 동기화 안에서 읽기 위한 참조
  const latest = useRef(records);
  latest.current = records;

  const commit = useCallback((next: ConsultationRecord[]): StorageResult => {
    const result = saveRecords(next);
    if (result.ok) setRecords(next);
    return result;
  }, []);

  /** 서버 작업을 뒤에서 실행하고 결과만 상태에 남깁니다. */
  const pushRemote = useCallback(
    (work: (store: RemoteRecordStore) => Promise<void>) => {
      if (!remote) return;
      work(remote)
        .then(() => setSyncStatus({ state: 'synced', lastSyncAt: new Date().toISOString(), error: null }))
        .catch((err: unknown) => setSyncStatus((s) => ({ ...s, state: 'error', error: err instanceof Error ? err.message : '서버에 반영하지 못했어요.' })));
    },
    [remote],
  );

  /** 서버와 전체를 맞춥니다: 내려받아 병합 → 기기 저장 → 기기 쪽이 새로운 것 올리기 */
  const sync = useCallback(async (): Promise<void> => {
    if (!remote) return;
    setSyncStatus((s) => ({ ...s, state: 'syncing', error: null }));
    try {
      const rows = await remote.fetchAll();
      const merged = mergeRemote(latest.current, rows);
      const saved = commit(merged.records);
      if (!saved.ok) throw new Error(saved.reason);
      await remote.upsert(merged.toUpload);
      setSyncStatus({ state: 'synced', lastSyncAt: new Date().toISOString(), error: null });
    } catch (err) {
      setSyncStatus((s) => ({ ...s, state: 'error', error: err instanceof Error ? err.message : '서버와 맞추지 못했어요.' }));
    }
  }, [remote, commit]);

  // 로그인/로그아웃 시: 로그인하면 한 번 맞추고, 로그아웃하면 동기화를 끕니다(기기 기록은 그대로).
  useEffect(() => {
    if (!remote) {
      setSyncStatus({ state: 'off', lastSyncAt: null, error: null });
      return;
    }
    void sync();
  }, [remote, sync]);

  const save = useCallback(
    (draft: UpsertDraft): StorageResult & { record?: ConsultationRecord; isNew?: boolean } => {
      const { records: next, record, isNew } = upsertRecord(records, draft);
      const result = commit(next);
      if (result.ok) pushRemote((store) => store.upsert([record]));
      return result.ok ? { ok: true, record, isNew } : result;
    },
    [records, commit, pushRemote],
  );

  const updateMemo = useCallback(
    (id: string, memo: string) => {
      const next = updateMemoIn(records, id, memo);
      const result = commit(next);
      if (result.ok) pushRemote((store) => store.upsert(next.filter((r) => r.id === id)));
      return result;
    },
    [records, commit, pushRemote],
  );

  const update = useCallback(
    (id: string, patch: Parameters<typeof patchRecord>[2]) => {
      const next = patchRecord(records, id, patch);
      const result = commit(next);
      if (result.ok) pushRemote((store) => store.upsert(next.filter((r) => r.id === id)));
      return result;
    },
    [records, commit, pushRemote],
  );

  const remove = useCallback(
    (id: string) => {
      const result = commit(deleteFrom(records, id));
      if (result.ok) pushRemote((store) => store.softDelete([id]));
      return result;
    },
    [records, commit, pushRemote],
  );

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
      if (result.ok) pushRemote((store) => store.upsert(merged.records));
      return result.ok ? { ok: true, added: merged.added, updated: merged.updated } : result;
    },
    [records, commit, pushRemote],
  );

  const clearAll = useCallback((): StorageResult => {
    const result = clearAllRecords();
    if (result.ok) {
      setRecords([]);
      pushRemote((store) => store.softDeleteAll());
    }
    return result;
  }, [pushRemote]);

  return { records, save, updateMemo, update, remove, clearAll, exportJson, importFromText, sync, syncStatus, synced: !!remote };
}

export type RecordsApi = ReturnType<typeof useRecords>;
