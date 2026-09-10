import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConsultationRecord } from '../domain/types';

/**
 * 로그인한 사용자의 기록을 서버 표(tarot_records)에 넣고 꺼냅니다.
 * 표는 본인 행만 읽고 쓸 수 있는 정책(RLS)으로 보호되며, 삭제는 행을 지우지 않고 deleted_at 을 찍어
 * 다른 기기가 지운 기록을 되살리지 않게 합니다. (supabase/sql/records.sql)
 */
export interface RemoteRecordRow {
  id: string;
  consultation_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  data: unknown;
}

export interface RemoteRecordStore {
  fetchAll(): Promise<RemoteRecordRow[]>;
  upsert(records: ConsultationRecord[]): Promise<void>;
  softDelete(ids: string[], at?: string): Promise<void>;
  softDeleteAll(at?: string): Promise<void>;
}

const TABLE = 'tarot_records';

export function createRemoteRecordStore(client: SupabaseClient, userId: string): RemoteRecordStore {
  const fail = (what: string, message: string) => new Error(`${what}: ${message}`);
  return {
    async fetchAll() {
      const { data, error } = await client.from(TABLE).select('id, consultation_id, created_at, updated_at, deleted_at, data').eq('user_id', userId);
      if (error) throw fail('기록을 불러오지 못했어요', error.message);
      return (data ?? []) as RemoteRecordRow[];
    },
    async upsert(records) {
      if (records.length === 0) return;
      const rows = records.map((r) => ({
        id: r.id,
        user_id: userId,
        consultation_id: r.consultationId,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
        deleted_at: null,
        data: r,
      }));
      const { error } = await client.from(TABLE).upsert(rows, { onConflict: 'id' });
      if (error) throw fail('기록을 올리지 못했어요', error.message);
    },
    async softDelete(ids, at = new Date().toISOString()) {
      if (ids.length === 0) return;
      const { error } = await client.from(TABLE).update({ deleted_at: at, updated_at: at }).in('id', ids).eq('user_id', userId);
      if (error) throw fail('삭제를 서버에 반영하지 못했어요', error.message);
    },
    async softDeleteAll(at = new Date().toISOString()) {
      const { error } = await client.from(TABLE).update({ deleted_at: at, updated_at: at }).eq('user_id', userId).is('deleted_at', null);
      if (error) throw fail('삭제를 서버에 반영하지 못했어요', error.message);
    },
  };
}
