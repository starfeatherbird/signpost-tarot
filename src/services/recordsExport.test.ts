import { describe, expect, it } from 'vitest';
import type { ConsultationRecord, ReadingResult } from '../domain/types';
import { buildExport, mergeRecords, parseImport } from './records';

const result: ReadingResult = {
  priority: 'p', reasons: ['r'], alternatives: ['a'], actions: ['x'], perspectives: [], isSample: false, notes: [], generatedAt: '2026-09-10T00:00:00.000Z',
};

function record(id: string, updatedAt: string, memo = ''): ConsultationRecord {
  return {
    id, consultationId: `c-${id}`, createdAt: updatedAt, updatedAt, plan: 'basic', concern: `고민 ${id}`,
    answers: [], deepAnswers: [], cards: [{ cardId: 'fool', positionId: 'core' }, { cardId: 'sun', positionId: 'blindspot', reversed: true }, { cardId: 'star', positionId: 'next' }],
    result, deepResult: null, followUps: [], actionChecks: [], isSample: false, followUpMemo: memo,
  };
}

describe('기록 내보내기·가져오기', () => {
  it('내보낸 파일을 다시 읽으면 같은 기록이 나온다 (역방향 포함)', () => {
    const text = JSON.stringify(buildExport([record('a', '2026-09-10T01:00:00.000Z', '메모')], '이정표'));
    const parsed = parseImport(text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].followUpMemo).toBe('메모');
    expect(parsed[0].cards[1].reversed).toBe(true);
  });

  it('형식이 아닌 파일은 거부한다', () => {
    expect(() => parseImport('hello')).toThrow('형식');
    expect(() => parseImport('{"records":[]}')).toThrow('기록이 없어요');
    expect(() => parseImport('{"foo":1}')).toThrow('형식');
  });

  it('합칠 때 같은 id 는 더 최근 것만 남고, 새 기록은 추가된다', () => {
    const existing = [record('a', '2026-09-10T01:00:00.000Z', '옛 메모'), record('b', '2026-09-09T01:00:00.000Z')];
    const incoming = [record('a', '2026-09-11T01:00:00.000Z', '새 메모'), record('c', '2026-09-08T01:00:00.000Z')];
    const merged = mergeRecords(existing, incoming);
    expect(merged.added).toBe(1);
    expect(merged.updated).toBe(1);
    expect(merged.records.map((r) => r.id)).toEqual(['a', 'b', 'c']); // 최신순
    expect(merged.records.find((r) => r.id === 'a')?.followUpMemo).toBe('새 메모');
  });

  it('오래된 사본으로는 최신 기록을 덮어쓰지 않는다', () => {
    const existing = [record('a', '2026-09-11T00:00:00.000Z', '최신')];
    const merged = mergeRecords(existing, [record('a', '2026-09-01T00:00:00.000Z', '옛것')]);
    expect(merged.updated).toBe(0);
    expect(merged.records[0].followUpMemo).toBe('최신');
  });
});
