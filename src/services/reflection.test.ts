import { describe, expect, it } from 'vitest';
import type { ReadingResult } from '../domain/types';
import { getRecordStone, getReflectionQuestion, getReflectionStatus } from './reflection';

const base: ReadingResult = {
  priority: 'p', reasons: [], alternatives: [], actions: [], perspectives: [], isSample: true, notes: [], generatedAt: 'x',
};
const withQuestion: ReadingResult = { ...base, reflectionQuestion: '그 사이 확인된 사실이 있었나요?', stone: { stoneId: 'moonstone', promise: '약속' } };

describe('이후 돌아보기', () => {
  it('질문이 없는 예전 기록은 none', () => {
    expect(getReflectionStatus({ result: base, deepResult: null, createdAt: '2026-09-01T00:00:00.000Z', followUpMemo: '' })).toBe('none');
  });

  it('저장 3일 전에는 waiting, 3일이 지나면 due', () => {
    const record = { result: withQuestion, deepResult: null, createdAt: '2026-09-01T00:00:00.000Z', followUpMemo: '' };
    expect(getReflectionStatus(record, new Date('2026-09-03T23:00:00.000Z'))).toBe('waiting');
    expect(getReflectionStatus(record, new Date('2026-09-04T00:00:00.000Z'))).toBe('due');
  });

  it('메모를 남기면 시점과 관계없이 done', () => {
    const record = { result: withQuestion, deepResult: null, createdAt: '2026-09-01T00:00:00.000Z', followUpMemo: '친구가 먼저 연락했어요.' };
    expect(getReflectionStatus(record, new Date('2026-09-02T00:00:00.000Z'))).toBe('done');
  });

  it('심층 결과의 질문·스톤을 기본 결과보다 우선한다', () => {
    const deep = { ...withQuestion, kind: 'deep' as const, reflectionQuestion: '심층 질문', stone: { stoneId: 'jade', promise: '심층 약속' }, criteriaSummary: '', comparisons: [], fitConditions: [], executionSteps: [], obstacles: [] };
    expect(getReflectionQuestion({ result: withQuestion, deepResult: deep })).toBe('심층 질문');
    expect(getRecordStone({ result: withQuestion, deepResult: deep })?.stoneId).toBe('jade');
    expect(getRecordStone({ result: withQuestion, deepResult: null })?.stoneId).toBe('moonstone');
  });
});
