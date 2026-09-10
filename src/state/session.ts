import { REVERSED_RATE, STORAGE_KEYS } from '../config/appConfig';
import { CARDS_TO_PICK, POSITIONS } from '../data/positions';
import type { Answer, DeepReadingResult, DrawnCard, FollowUp, PlanId, ReadingResult } from '../domain/types';
import { createShuffledDeck, drawReversed, isValidDeck } from '../services/deck';
import { createId } from '../services/records';
import { readJson, removeKey, writeJson } from '../services/storage';

/** 상담 흐름의 단계 */
export type Step =
  | 'plan'          // 상품 선택
  | 'deepIntro'     // 심층 상담 체험 안내
  | 'input'         // 고민 입력
  | 'questions'     // 기본 상황 확인
  | 'deepQuestions' // 심층 질문 (기준·제약·선택지)
  | 'cards'         // 카드 선택·공개
  | 'analyzing'     // 분석 대기
  | 'result'        // 기본 결과
  | 'deepResult';   // 심층 결과

export type AnalysisStatus = 'idle' | 'loading' | 'error';

/** 진행 중인 상담 상태. 새로고침 복구를 위해 localStorage 에 임시 저장됩니다. */
export interface SessionState {
  consultationId: string;
  step: Step;
  plan: PlanId;
  /** 심층 안내 화면의 진입 경로: 처음부터 심층 / 무료 결과에서 전환 */
  deepIntroMode: 'start' | 'upgrade';
  concern: string;
  questionIndex: number;
  answers: Answer[];
  deepQuestionIndex: number;
  deepAnswers: Answer[];
  /** 섞인 덱(카드 ID 순서). 세션 시작 시 한 번 정해지고 바뀌지 않습니다. */
  deck: string[];
  /** 역방향으로 뽑힐 카드 ID 목록 (덱과 함께 세션 시작 시 정해짐) */
  reversedIds: string[];
  /** 선택한 카드 ID (선택 순서 = 자리 순서) */
  selected: string[];
  revealed: boolean;
  supplement: string;
  result: ReadingResult | null;
  deepResult: DeepReadingResult | null;
  followUps: FollowUp[];
  /** '지금 할 수 있는 일' 중 체크한 항목 (기록에 함께 저장) */
  actionChecks: string[];
  /** 호출 횟수 제한에 걸린 경우 풀리는 시각 (ISO). 그 전에는 고민 입력 화면에 안내를 보여 줍니다. */
  rateLimitedUntil: string | null;
  /** 저장된 기록 ID 와 그 때의 내용 버전 (변경 감지용) */
  savedRecordId: string | null;
  savedVersion: string | null;
  analysisStatus: AnalysisStatus;
  analysisError: string | null;
}

export function createInitialSession(): SessionState {
  const deck = createShuffledDeck();
  return {
    consultationId: createId(),
    step: 'plan',
    plan: 'basic',
    deepIntroMode: 'start',
    concern: '',
    questionIndex: 0,
    answers: [],
    deepQuestionIndex: 0,
    deepAnswers: [],
    deck,
    reversedIds: drawReversed(deck, REVERSED_RATE),
    selected: [],
    revealed: false,
    supplement: '',
    result: null,
    deepResult: null,
    followUps: [],
    actionChecks: [],
    rateLimitedUntil: null,
    savedRecordId: null,
    savedVersion: null,
    analysisStatus: 'idle',
    analysisError: null,
  };
}

export type SessionAction =
  | { type: 'choosePlan'; plan: PlanId }
  | { type: 'openDeepIntro'; mode: 'start' | 'upgrade' }
  | { type: 'startDeepTrial' }
  | { type: 'setConcern'; concern: string }
  | { type: 'goToStep'; step: Step }
  | { type: 'setQuestionIndex'; index: number }
  | { type: 'answer'; answer: Answer }
  | { type: 'setDeepQuestionIndex'; index: number }
  | { type: 'deepAnswer'; answer: Answer }
  | { type: 'toggleCard'; cardId: string }
  | { type: 'reveal' }
  | { type: 'setSupplement'; supplement: string }
  | { type: 'analysisStarted' }
  | { type: 'analysisSucceeded'; result: ReadingResult }
  | { type: 'deepAnalysisSucceeded'; result: DeepReadingResult }
  | { type: 'analysisFailed'; message: string }
  | { type: 'addFollowUp'; followUp: FollowUp }
  | { type: 'toggleAction'; action: string }
  | { type: 'setRateLimited'; until: string | null }
  | { type: 'markSaved'; recordId: string; version: string }
  | { type: 'reset' };

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'choosePlan':
      return action.plan === 'deep'
        ? { ...state, plan: 'deep', deepIntroMode: 'start', step: 'deepIntro' }
        : { ...state, plan: 'basic', step: 'input' };
    case 'openDeepIntro':
      return { ...state, deepIntroMode: action.mode, step: 'deepIntro' };
    case 'startDeepTrial':
      // 처음부터 심층: 고민 입력으로. 무료 결과에서 전환: 기존 입력·카드를 이어받아 심층 질문부터.
      return state.deepIntroMode === 'upgrade'
        ? { ...state, plan: 'deep', step: 'deepQuestions', deepQuestionIndex: 0 }
        : { ...state, plan: 'deep', step: 'input' };
    case 'setConcern':
      return { ...state, concern: action.concern };
    case 'goToStep':
      return { ...state, step: action.step };
    case 'setQuestionIndex':
      return { ...state, questionIndex: Math.max(0, action.index) };
    case 'answer':
      return { ...state, answers: upsertAnswer(state.answers, action.answer) };
    case 'setDeepQuestionIndex':
      return { ...state, deepQuestionIndex: Math.max(0, action.index) };
    case 'deepAnswer':
      return { ...state, deepAnswers: upsertAnswer(state.deepAnswers, action.answer) };
    case 'toggleCard': {
      if (state.revealed) return state;
      if (state.selected.includes(action.cardId)) {
        return { ...state, selected: state.selected.filter((id) => id !== action.cardId) };
      }
      if (state.selected.length >= CARDS_TO_PICK) return state;
      if (!state.deck.includes(action.cardId)) return state;
      return { ...state, selected: [...state.selected, action.cardId] };
    }
    case 'reveal':
      if (state.selected.length !== CARDS_TO_PICK) return state;
      return { ...state, revealed: true };
    case 'setSupplement':
      return { ...state, supplement: action.supplement };
    case 'analysisStarted':
      return { ...state, step: 'analyzing', analysisStatus: 'loading', analysisError: null };
    case 'analysisSucceeded':
      return { ...state, step: 'result', analysisStatus: 'idle', analysisError: null, result: action.result };
    case 'deepAnalysisSucceeded':
      return { ...state, step: 'deepResult', analysisStatus: 'idle', analysisError: null, deepResult: action.result };
    case 'analysisFailed':
      return { ...state, analysisStatus: 'error', analysisError: action.message };
    case 'addFollowUp':
      return { ...state, followUps: [...state.followUps, action.followUp] };
    case 'toggleAction':
      return {
        ...state,
        actionChecks: state.actionChecks.includes(action.action)
          ? state.actionChecks.filter((a) => a !== action.action)
          : [...state.actionChecks, action.action],
      };
    case 'setRateLimited':
      return { ...state, rateLimitedUntil: action.until };
    case 'markSaved':
      return { ...state, savedRecordId: action.recordId, savedVersion: action.version };
    case 'reset':
      // 호출 제한 상태는 새 상담을 시작해도 유지됩니다.
      return { ...createInitialSession(), rateLimitedUntil: state.rateLimitedUntil };
    default:
      return state;
  }
}

function upsertAnswer(list: Answer[], answer: Answer): Answer[] {
  return [...list.filter((a) => a.questionId !== answer.questionId), answer];
}

/** 선택한 카드를 자리와 묶어 돌려줍니다. */
export function getDrawnCards(state: SessionState): DrawnCard[] {
  return state.selected.slice(0, CARDS_TO_PICK).map((cardId, i) => ({ cardId, positionId: POSITIONS[i].id, reversed: state.reversedIds.includes(cardId) }));
}

/** 진행 중인 내용이 있어 새 상담 시작 전에 확인이 필요한지 */
export function hasProgress(state: SessionState): boolean {
  return (
    state.concern.trim().length > 0 ||
    state.answers.length > 0 ||
    state.selected.length > 0 ||
    !!state.result ||
    !!state.deepResult
  );
}

/** 저장 대상 내용의 버전 문자열. 결과·심층 결과·추가 질문이 바뀌면 달라집니다. */
export function getContentVersion(state: SessionState): string {
  return [state.result?.generatedAt ?? '', state.deepResult?.generatedAt ?? '', state.followUps.length, [...state.actionChecks].sort().join(',')].join('|');
}

/** 저장 상태: 아직 저장 안 됨 / 저장됨(변경 없음) / 저장 후 결과가 바뀜 */
export type SaveStatus = 'unsaved' | 'saved' | 'changed';
export function getSaveStatus(state: SessionState): SaveStatus {
  if (!state.savedRecordId || (!state.result && !state.deepResult)) return 'unsaved';
  return state.savedVersion === getContentVersion(state) ? 'saved' : 'changed';
}

/** 분석이 끝난 뒤 돌아갈 결과 화면 */
export function resultStepFor(state: SessionState): Step {
  return state.plan === 'deep' && state.deepResult ? 'deepResult' : 'result';
}

// ---- 임시 저장(새로고침 복구) ----

const STEPS: Step[] = ['plan', 'deepIntro', 'input', 'questions', 'deepQuestions', 'cards', 'analyzing', 'result', 'deepResult'];

function isSessionState(value: unknown): value is SessionState {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.consultationId === 'string' &&
    typeof s.step === 'string' && STEPS.includes(s.step as Step) &&
    (s.plan === 'basic' || s.plan === 'deep') &&
    typeof s.concern === 'string' &&
    typeof s.questionIndex === 'number' &&
    Array.isArray(s.answers) &&
    Array.isArray(s.deepAnswers) &&
    isValidDeck(s.deck) &&
    Array.isArray(s.selected) && s.selected.every((id) => typeof id === 'string') &&
    new Set(s.selected as string[]).size === (s.selected as string[]).length &&
    (s.selected as string[]).every((id) => (s.deck as string[]).includes(id)) &&
    typeof s.revealed === 'boolean' &&
    typeof s.supplement === 'string' &&
    Array.isArray(s.followUps)
  );
}

export function loadSession(): SessionState {
  const saved = readJson(STORAGE_KEYS.draft, isSessionState);
  if (!saved) return createInitialSession();
  // 분석 도중 새로고침한 경우: 로딩 상태는 복구하지 않고 재시도 가능한 상태로 둡니다.
  return {
    ...createInitialSession(),
    ...saved,
    analysisStatus: 'idle',
    analysisError: null,
    result: saved.result ?? null,
    deepResult: saved.deepResult ?? null,
  };
}

export function persistSession(state: SessionState): void {
  // 실패해도 앱 동작에는 영향이 없으므로 결과를 무시합니다(임시 보관 목적).
  writeJson(STORAGE_KEYS.draft, state);
}

export function clearSessionDraft(): void {
  removeKey(STORAGE_KEYS.draft);
}
