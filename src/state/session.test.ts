import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../config/appConfig';
import type { DeepReadingResult, ReadingResult } from '../domain/types';
import {
  createInitialSession,
  getContentVersion,
  getDrawnCards,
  getSaveStatus,
  loadSession,
  persistSession,
  sessionReducer,
  type SessionState,
} from './session';

function installFakeStorage() {
  const store = new Map<string, string>();
  const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
  (globalThis as unknown as { window: unknown }).window = { localStorage: storage };
  return storage;
}

const result: ReadingResult = {
  priority: 'p', reasons: [], alternatives: [], actions: [], perspectives: [],
  isSample: true, notes: [], generatedAt: '2026-09-09T00:00:00.000Z',
};
const deepResult: DeepReadingResult = {
  ...result, kind: 'deep', criteriaSummary: '', comparisons: [], fitConditions: [], executionSteps: [], obstacles: [],
  generatedAt: '2026-09-09T01:00:00.000Z',
};

function pickThree(s: SessionState): SessionState {
  const [a, b, c] = s.deck;
  for (const id of [a, b, c]) s = sessionReducer(s, { type: 'toggleCard', cardId: id });
  return s;
}

describe('session reducer', () => {
  it('처음에는 상품 선택 화면에서 시작한다', () => {
    expect(createInitialSession().step).toBe('plan');
  });

  it('같은 카드를 두 번 선택할 수 없고, 3장을 넘겨 선택할 수 없다', () => {
    let s = createInitialSession();
    const [a, b, c, d] = s.deck;
    s = sessionReducer(s, { type: 'toggleCard', cardId: a });
    s = sessionReducer(s, { type: 'toggleCard', cardId: a }); // 취소
    expect(s.selected).toEqual([]);
    s = sessionReducer(s, { type: 'toggleCard', cardId: a });
    s = sessionReducer(s, { type: 'toggleCard', cardId: b });
    s = sessionReducer(s, { type: 'toggleCard', cardId: c });
    s = sessionReducer(s, { type: 'toggleCard', cardId: d });
    expect(s.selected).toEqual([a, b, c]);
    expect(getDrawnCards(s).map((x) => x.positionId)).toEqual(['core', 'blindspot', 'next']);
  });

  it('덱에 없는 카드는 선택되지 않고, 공개 후에는 선택이 바뀌지 않는다', () => {
    let s = createInitialSession();
    s = sessionReducer(s, { type: 'toggleCard', cardId: 'nope' });
    expect(s.selected).toEqual([]);
    s = pickThree(s);
    s = sessionReducer(s, { type: 'reveal' });
    expect(s.revealed).toBe(true);
    s = sessionReducer(s, { type: 'toggleCard', cardId: s.deck[0] });
    expect(s.selected).toEqual(s.deck.slice(0, 3));
  });

  it('분석 실패·재시도를 거쳐도 덱과 선택 카드가 유지된다', () => {
    let s = createInitialSession();
    const deck = [...s.deck];
    s = pickThree(s);
    s = sessionReducer(s, { type: 'analysisStarted' });
    s = sessionReducer(s, { type: 'analysisFailed', message: '실패' });
    expect(s.analysisStatus).toBe('error');
    s = sessionReducer(s, { type: 'analysisStarted' });
    s = sessionReducer(s, { type: 'analysisSucceeded', result });
    expect(s.step).toBe('result');
    expect(s.deck).toEqual(deck);
    expect(s.selected).toEqual(deck.slice(0, 3));
  });

  it('이전 단계로 돌아가도 답변이 유지되고, 같은 질문의 답은 덮어쓴다', () => {
    let s = createInitialSession();
    s = sessionReducer(s, { type: 'answer', answer: { questionId: 'q1', questionText: 't', value: 'A' } });
    s = sessionReducer(s, { type: 'goToStep', step: 'input' });
    s = sessionReducer(s, { type: 'answer', answer: { questionId: 'q1', questionText: 't', value: 'B' } });
    expect(s.answers).toEqual([{ questionId: 'q1', questionText: 't', value: 'B' }]);
  });

  it('심층 상담을 처음부터 고르면 안내 화면을 거쳐 고민 입력으로 간다', () => {
    let s = createInitialSession();
    s = sessionReducer(s, { type: 'choosePlan', plan: 'deep' });
    expect(s.step).toBe('deepIntro');
    expect(s.deepIntroMode).toBe('start');
    s = sessionReducer(s, { type: 'startDeepTrial' });
    expect(s.plan).toBe('deep');
    expect(s.step).toBe('input');
  });

  it('무료 결과에서 심층으로 전환하면 고민·답변·카드를 유지한 채 심층 질문부터 진행한다', () => {
    let s = createInitialSession();
    s = sessionReducer(s, { type: 'choosePlan', plan: 'basic' });
    s = sessionReducer(s, { type: 'setConcern', concern: '고민' });
    s = sessionReducer(s, { type: 'answer', answer: { questionId: 'priority', questionText: 't', value: '관계' } });
    s = pickThree(s);
    s = sessionReducer(s, { type: 'reveal' });
    s = sessionReducer(s, { type: 'analysisSucceeded', result });
    const cardsBefore = [...s.selected];

    s = sessionReducer(s, { type: 'openDeepIntro', mode: 'upgrade' });
    expect(s.step).toBe('deepIntro');
    s = sessionReducer(s, { type: 'startDeepTrial' });
    expect(s.plan).toBe('deep');
    expect(s.step).toBe('deepQuestions');
    expect(s.concern).toBe('고민');
    expect(s.answers).toHaveLength(1);
    expect(s.selected).toEqual(cardsBefore);
    expect(s.revealed).toBe(true);

    s = sessionReducer(s, { type: 'deepAnalysisSucceeded', result: deepResult });
    expect(s.step).toBe('deepResult');
    expect(s.result).toEqual(result); // 무료 결과 보존
    expect(s.deepResult).toEqual(deepResult);
  });

  it('저장 상태를 구분한다: 미저장 → 저장됨 → 심층 결과·추가 질문으로 변경', () => {
    let s = createInitialSession();
    s = sessionReducer(s, { type: 'analysisSucceeded', result });
    expect(getSaveStatus(s)).toBe('unsaved');
    s = sessionReducer(s, { type: 'markSaved', recordId: 'r1', version: getContentVersion(s) });
    expect(getSaveStatus(s)).toBe('saved');
    s = sessionReducer(s, { type: 'deepAnalysisSucceeded', result: deepResult });
    expect(getSaveStatus(s)).toBe('changed');
    s = sessionReducer(s, { type: 'markSaved', recordId: 'r1', version: getContentVersion(s) });
    expect(getSaveStatus(s)).toBe('saved');
    s = sessionReducer(s, { type: 'addFollowUp', followUp: { question: 'q', answer: 'a', isSample: true, askedAt: 'x' } });
    expect(getSaveStatus(s)).toBe('changed');
  });
});

describe('session persistence', () => {
  beforeEach(() => {
    installFakeStorage();
  });

  it('임시 보관한 세션을 복구한다', () => {
    let s = createInitialSession();
    s = sessionReducer(s, { type: 'choosePlan', plan: 'deep' });
    s = sessionReducer(s, { type: 'startDeepTrial' });
    s = sessionReducer(s, { type: 'setConcern', concern: '고민' });
    const [a, b] = s.deck;
    s = sessionReducer(s, { type: 'toggleCard', cardId: a });
    s = sessionReducer(s, { type: 'toggleCard', cardId: b });
    s = sessionReducer(s, { type: 'goToStep', step: 'cards' });
    persistSession(s);

    const restored = loadSession();
    expect(restored.plan).toBe('deep');
    expect(restored.concern).toBe('고민');
    expect(restored.deck).toEqual(s.deck);
    expect(restored.selected).toEqual([a, b]);
    expect(restored.step).toBe('cards');
    expect(restored.consultationId).toBe(s.consultationId);
  });

  it('손상된 임시 보관 데이터는 새 세션으로 대체한다', () => {
    const storage = installFakeStorage();
    storage.setItem(STORAGE_KEYS.draft, '{"step":"cards","deck":["fool","fool"]}');
    const restored = loadSession();
    expect(restored.step).toBe('plan');
    expect(new Set(restored.deck).size).toBe(22);
  });
});
