import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../config/appConfig';
import type { ConsultationRecord, DeepReadingResult, ReadingResult } from '../domain/types';
import { loadRecords, mergeRemote, saveRecords, updateMemo, upsertRecord, type RecordDraft } from './records';

// node 환경에서 localStorage 를 흉내 냅니다.
function installFakeStorage() {
  const store = new Map<string, string>();
  const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  };
  (globalThis as unknown as { window: unknown }).window = { localStorage: storage };
  return storage;
}

const result: ReadingResult = {
  priority: '먼저 이쪽',
  reasons: ['이유'],
  alternatives: ['대안'],
  actions: ['행동'],
  perspectives: [],
  isSample: true,
  notes: [],
  generatedAt: '2026-09-09T00:00:00.000Z',
};

const deepResult: DeepReadingResult = {
  ...result,
  kind: 'deep',
  criteriaSummary: '기준',
  comparisons: [{ option: 'A', benefits: ['b'], burdens: ['c'] }],
  fitConditions: ['f'],
  executionSteps: ['s'],
  obstacles: [{ obstacle: 'o', response: 'r' }],
  generatedAt: '2026-09-09T01:00:00.000Z',
};

const draft: RecordDraft = {
  consultationId: 'c-1',
  plan: 'basic',
  concern: '고민',
  answers: [],
  deepAnswers: [],
  cards: [
    { cardId: 'fool', positionId: 'core' },
    { cardId: 'sun', positionId: 'blindspot' },
    { cardId: 'star', positionId: 'next' },
  ],
  result,
  deepResult: null,
  followUps: [],
  actionChecks: [],
  isSample: true,
};

describe('records', () => {
  beforeEach(() => {
    installFakeStorage();
  });

  it('같은 상담을 여러 번 저장해도 하나만 남는다', () => {
    const first = upsertRecord([], draft, '2026-09-09T01:00:00.000Z');
    expect(first.isNew).toBe(true);
    const second = upsertRecord(first.records, draft, '2026-09-09T02:00:00.000Z');
    expect(second.isNew).toBe(false);
    expect(second.records).toHaveLength(1);
    expect(second.records[0].id).toBe(first.record.id);
    expect(second.records[0].updatedAt).toBe('2026-09-09T02:00:00.000Z');
  });

  it('무료 결과를 저장한 뒤 심층 결과를 붙여 저장하면 같은 기록에 연결된다', () => {
    const first = upsertRecord([], draft);
    const upgraded: RecordDraft = { ...draft, plan: 'deep', deepResult, followUps: [{ question: 'q', answer: 'a', isSample: true, askedAt: 'x' }] };
    const second = upsertRecord(first.records, upgraded);
    expect(second.records).toHaveLength(1);
    expect(second.records[0].plan).toBe('deep');
    expect(second.records[0].result?.priority).toBe('먼저 이쪽');
    expect(second.records[0].deepResult?.comparisons).toHaveLength(1);
    expect(second.records[0].followUps).toHaveLength(1);
  });

  it('저장 후 다시 불러오면 메모까지 유지된다', () => {
    const { records } = upsertRecord([], draft);
    const withMemo = updateMemo(records, records[0].id, '나중에 잘 풀렸어요');
    expect(saveRecords(withMemo).ok).toBe(true);
    const loaded = loadRecords();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].followUpMemo).toBe('나중에 잘 풀렸어요');
  });

  it('상품 구분 전 형식의 기록도 기본값을 채워 읽는다', () => {
    const storage = installFakeStorage();
    const legacy = { id: 'r0', consultationId: 'c0', createdAt: 'x', concern: '옛 고민', answers: [], cards: draft.cards, result, followUpMemo: '' };
    storage.setItem(STORAGE_KEYS.records, JSON.stringify([legacy]));
    const loaded = loadRecords();
    expect(loaded[0].plan).toBe('basic');
    expect(loaded[0].deepResult).toBeNull();
    expect(loaded[0].followUps).toEqual([]);
    expect(loaded[0].isSample).toBe(true);
  });

  it('손상된 데이터가 있어도 멈추지 않고 살릴 수 있는 항목만 돌려준다', () => {
    const storage = installFakeStorage();
    storage.setItem(STORAGE_KEYS.records, '{not json');
    expect(loadRecords()).toEqual([]);

    const good: ConsultationRecord = { ...draft, id: 'r1', createdAt: 'x', updatedAt: 'x', followUpMemo: '' };
    storage.setItem(STORAGE_KEYS.records, JSON.stringify([good, { broken: true }, null]));
    const loaded = loadRecords();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('r1');
  });

  it('서버 병합: 최근 수정이 이기고, 삭제 표시는 더 최근일 때만 지우며, 기기에만 있는 것은 올린다', () => {
    const mk = (id: string, updatedAt: string, memo = ''): ConsultationRecord => ({ ...draft, id, consultationId: `c-${id}`, createdAt: '2026-09-01T00:00:00.000Z', updatedAt, followUpMemo: memo });
    const local = [mk('same-old', '2026-09-02T00:00:00.000Z'), mk('mine-newer', '2026-09-05T00:00:00.000Z', '기기'), mk('deleted-remote', '2026-09-02T00:00:00.000Z'), mk('resurrect', '2026-09-06T00:00:00.000Z', '살림'), mk('local-only', '2026-09-03T00:00:00.000Z')];
    const remote = [
      { id: 'same-old', updated_at: '2026-09-04T00:00:00.000Z', deleted_at: null, data: mk('same-old', '2026-09-04T00:00:00.000Z', '서버') },
      { id: 'mine-newer', updated_at: '2026-09-04T00:00:00.000Z', deleted_at: null, data: mk('mine-newer', '2026-09-04T00:00:00.000Z', '서버') },
      { id: 'deleted-remote', updated_at: '2026-09-03T00:00:00.000Z', deleted_at: '2026-09-03T00:00:00.000Z', data: mk('deleted-remote', '2026-09-02T00:00:00.000Z') },
      { id: 'resurrect', updated_at: '2026-09-05T00:00:00.000Z', deleted_at: '2026-09-05T00:00:00.000Z', data: mk('resurrect', '2026-09-04T00:00:00.000Z') },
      { id: 'remote-only', updated_at: '2026-09-02T00:00:00.000Z', deleted_at: null, data: mk('remote-only', '2026-09-02T00:00:00.000Z') },
      { id: 'broken', updated_at: '2026-09-02T00:00:00.000Z', deleted_at: null, data: { nope: true } },
    ];
    const { records, toUpload } = mergeRemote(local, remote);
    const ids = records.map((r) => r.id).sort();
    expect(ids).toEqual(['local-only', 'mine-newer', 'remote-only', 'resurrect', 'same-old']);
    expect(records.find((r) => r.id === 'same-old')?.followUpMemo).toBe('서버');
    expect(records.find((r) => r.id === 'mine-newer')?.followUpMemo).toBe('기기');
    expect(toUpload.map((r) => r.id).sort()).toEqual(['local-only', 'mine-newer', 'resurrect']);
  });

  it('저장 실패를 정직하게 알린다', () => {
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: () => null,
        setItem: () => { throw new Error('QuotaExceeded'); },
        removeItem: () => {},
      },
    };
    const outcome = saveRecords([]);
    expect(outcome.ok).toBe(false);
  });
});
