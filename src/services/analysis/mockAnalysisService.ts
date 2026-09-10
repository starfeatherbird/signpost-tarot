import { MOCK_ANALYSIS_DELAY_MS, MOCK_ANALYSIS_FAILURE_RATE } from '../../config/appConfig';
import { getCard } from '../../data/cards';
import { POSITION_BY_ID } from '../../data/positions';
import type {
  AnalysisInput,
  Answer,
  DeepAnalysisInput,
  DeepReadingResult,
  DrawnCard,
  FollowUpInput,
  OptionComparison,
  ReadingResult,
  TarotCard,
} from '../../domain/types';
import { AnalysisError, type AnalysisService, type FollowUpAnswer } from './types';

/**
 * 로컬에서만 동작하는 모의 분석 서비스.
 *
 * - 선택된 카드의 이름·기본 의미·자리별 관점을 조합해 구조화된 예시 결과를 만듭니다.
 * - 고민 원문과 보충 내용을 "이해"하지는 않습니다. 사용자가 고른 선택지(상황 확인 답변)와
 *   직접 적은 선택지 이름만 문장에 그대로 반영하고, 자유 입력은 접수 사실만 알립니다.
 * - 결과에는 반드시 선택된 카드만 등장합니다.
 */

export interface MockOptions {
  delayMs?: number;
  failureRate?: number;
  random?: () => number;
}

export const SAMPLE_NOTE =
  '이 결과는 시제품 예시예요. 카드의 기본 의미와 선택하신 답변만으로 구성했고, 적어 주신 고민 내용을 실제로 분석한 것은 아니에요.';
const SUPPLEMENT_NOTE =
  '보충해 주신 내용은 접수했어요. 다만 지금은 예시 결과라 보충 내용이 해석에 반영되지는 않아요. 실제 분석이 연결되면 같은 카드로 다시 정리해 드릴 예정이에요.';

export function createMockAnalysisService(options: MockOptions = {}): AnalysisService {
  const delayMs = options.delayMs ?? MOCK_ANALYSIS_DELAY_MS;
  const failureRate = options.failureRate ?? MOCK_ANALYSIS_FAILURE_RATE;
  const random = options.random ?? Math.random;

  const maybeFail = () => {
    if (random() < failureRate) {
      throw new AnalysisError('정리하는 중에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  return {
    async analyze(input, { signal } = {}) {
      await wait(delayMs, signal);
      maybeFail();
      return buildSampleReading(input);
    },
    async analyzeDeep(input, { signal } = {}) {
      await wait(delayMs, signal);
      maybeFail();
      return buildDeepSampleReading(input);
    },
    async askFollowUp(input, { signal } = {}) {
      await wait(Math.round(delayMs * 0.7), signal);
      maybeFail();
      return buildSampleFollowUp(input);
    },
  };
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AnalysisError('취소되었어요.', false));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new AnalysisError('취소되었어요.', false));
    });
  });
}

interface ResolvedCard {
  card: TarotCard;
  drawn: DrawnCard;
}

interface Spread {
  resolved: ResolvedCard[];
  core: ResolvedCard;
  blind: ResolvedCard;
  next: ResolvedCard;
}

function resolveSpread(cards: DrawnCard[]): Spread {
  const resolved = cards.map((drawn) => {
    const card = getCard(drawn.cardId);
    if (!card) throw new AnalysisError('선택한 카드 정보를 찾을 수 없어요.', false);
    return { card, drawn };
  });
  const byPosition = (id: DrawnCard['positionId']) => resolved.find((r) => r.drawn.positionId === id);
  const core = byPosition('core');
  const blind = byPosition('blindspot');
  const next = byPosition('next');
  if (!core || !blind || !next) {
    throw new AnalysisError('세 자리의 카드가 모두 필요해요.', false);
  }
  return { resolved, core, blind, next };
}

// ---------- 무료 기본 상담 ----------

/** 순수 함수: 같은 입력이면 같은 결과. 테스트에서 직접 호출합니다. */
export function buildSampleReading(input: AnalysisInput, generatedAt = new Date().toISOString()): ReadingResult {
  const { resolved, core, blind, next } = resolveSpread(input.cards);

  const priorityAnswer = findAnswer(input.answers, 'priority');
  const constraintAnswer = findAnswer(input.answers, 'constraint');

  const priority = priorityAnswer
    ? `현재 말씀해 주신 조건에서는, '${priorityAnswer}'${objectParticle(priorityAnswer)} 지키는 쪽을 기준으로 삼아 「${next.card.nameKo}」 카드가 가리키는 방향을 먼저 제안드려요. ${next.card.perspectives.next}`
    : `현재 말씀해 주신 조건에서는 「${next.card.nameKo}」 카드가 가리키는 방향을 먼저 제안드려요. ${next.card.perspectives.next}`;

  const reasons = [
    `현재의 핵심 자리에 나온 「${core.card.nameKo}」는 ${core.card.essence} ${core.card.perspectives.core}`,
    `「${next.card.nameKo}」의 기본 의미는 ${next.card.essence} 지금 상황에서는 이 흐름에 맞춰 움직이는 편이 부담이 덜할 수 있어요.`,
  ];
  if (priorityAnswer) {
    reasons.push(`가장 지키고 싶은 것으로 '${priorityAnswer}'${objectParticle(priorityAnswer)} 꼽아 주셨기 때문에, 그 기준을 해치지 않는 범위에서의 움직임을 우선했어요.`);
  }

  const alternatives = [
    `「${blind.card.nameKo}」가 놓치고 있는 관점 자리에 나왔어요. ${blind.card.perspectives.blindspot} 이 부분이 크게 다가온다면 먼저 그쪽을 살펴보는 선택이 더 나을 수 있어요.`,
  ];
  if (constraintAnswer) {
    alternatives.push(`말씀해 주신 조건('${constraintAnswer}')이 당장 해결되기 어렵다면, 큰 결정을 잠시 미루고 조건을 먼저 정리하는 쪽이 적합할 수 있어요.`);
  } else {
    alternatives.push('선택을 어렵게 하는 조건이 새로 생기거나 커진다면, 결정을 잠시 미루고 조건을 먼저 정리하는 쪽이 적합할 수 있어요.');
  }

  const actions = uniq([
    ...next.card.actions.slice(0, 2),
    core.card.actions[0],
    '지금 떠오른 생각을 기록장에 남겨 두고, 며칠 뒤 다시 읽어 보기',
  ]).slice(0, 4);

  const perspectives = resolved.map(({ card, drawn }) => ({
    cardId: card.id,
    positionId: drawn.positionId,
    text: `${POSITION_BY_ID[drawn.positionId].title} 자리의 「${card.nameKo}」(${card.nameEn})는 ${card.essence} ${card.perspectives[drawn.positionId]} 핵심어: ${card.keywords.join(', ')}.`,
  }));

  const notes: string[] = [SAMPLE_NOTE];
  if (input.supplement && input.supplement.trim()) notes.push(SUPPLEMENT_NOTE);

  return { priority, reasons, alternatives, actions, perspectives, isSample: true, notes, generatedAt };
}

// ---------- 유료 심층 상담 ----------

export function buildDeepSampleReading(input: DeepAnalysisInput, generatedAt = new Date().toISOString()): DeepReadingResult {
  const base = buildSampleReading(input, generatedAt);
  const spread = resolveSpread(input.cards);
  const { core, blind, next } = spread;

  const priorityAnswer = findAnswer(input.answers, 'priority');
  const criteria = findAnswer(input.deepAnswers, 'criteria');
  const constraint = findAnswer(input.deepAnswers, 'constraints');
  const constraintText = constraint && constraint !== '특별히 없어요' ? constraint : null;
  const userOptions = findList(input.deepAnswers, 'options');

  const criteriaSummary = [
    criteria ? `가장 중요하게 보는 기준은 '${criteria}'${copula(criteria)}.` : '중요하게 보는 기준은 따로 정하지 않으셨어요.',
    constraintText ? `현실적인 제약으로 '${constraintText}'${objectParticle(constraintText)} 확인했어요.` : '꼭 고려해야 할 제약은 없다고 하셨어요.',
    priorityAnswer ? `기본 상담에서 지키고 싶다고 하신 '${priorityAnswer}'도 함께 기준으로 삼았어요.` : '',
  ].filter(Boolean).join(' ');

  // 선택지: 사용자가 적은 것이 있으면 그대로, 없으면 카드가 가리키는 두 방향으로 비교합니다.
  const optionNames = userOptions.length >= 2
    ? userOptions.slice(0, 3)
    : ['지금 방향을 유지하기', `「${next.card.nameKo}」가 가리키는 쪽으로 움직이기`];
  const cardsForOptions = [next, core, blind];
  const comparisons: OptionComparison[] = optionNames.map((option, i) => {
    const paired = cardsForOptions[i % cardsForOptions.length].card;
    return {
      option,
      benefits: uniq([
        `「${paired.nameKo}」의 '${paired.keywords[0]}' 흐름과 맞닿아 있어요. ${paired.perspectives.next}`,
        criteria ? `'${criteria}' 기준에서 이 선택이 무엇을 지켜 주는지 한 줄로 적어 보면 비교가 분명해져요.` : `이 선택으로 얻는 것을 한 줄로 적어 보면 비교가 분명해져요.`,
      ]),
      burdens: uniq([
        `「${paired.nameKo}」가 함께 비추는 '${paired.keywords[paired.keywords.length - 1]}' 쪽 부담을 살펴보세요.`,
        constraintText ? `'${constraintText}' 제약과 부딪히지 않는지 먼저 점검이 필요해요.` : '이 선택을 고르면 내려놓아야 하는 것을 함께 적어 보세요.',
      ]),
    };
  });

  const fitConditions = uniq([
    criteria ? `'${criteria}'${objectParticle(criteria)} 가장 앞에 두어도 괜찮은 상황일 때` : '지금의 우선순위가 당분간 바뀌지 않을 때',
    constraintText ? `'${constraintText}' 제약 안에서도 첫걸음을 뗄 수 있을 때` : '첫걸음을 작게 나눌 수 있을 때',
    `「${core.card.nameKo}」가 비추는 현재 상태(${core.card.keywords.join('·')})를 그대로 인정할 수 있을 때`,
  ]);

  const executionSteps = uniq([
    `먼저: ${next.card.actions[0]}`,
    `다음: ${core.card.actions[0]}`,
    `그다음: ${next.card.actions[1] ?? blind.card.actions[0]}`,
    '일주일 뒤: 기록장의 메모에 실제로 해 본 것과 느낀 점을 적고, 방향을 유지할지 다시 판단하기',
  ]);

  const obstacles = [
    {
      obstacle: `「${blind.card.nameKo}」가 가리키는 '${blind.card.keywords[0]}'${objectParticle(blind.card.keywords[0])} 놓칠 때`,
      response: blind.card.perspectives.blindspot,
    },
    {
      obstacle: constraintText ? `'${constraintText}' 문제가 예상보다 커질 때` : '예상보다 시간이 오래 걸릴 때',
      response: constraintText
        ? '제약을 먼저 해결하려 하기보다, 제약 안에서 가능한 가장 작은 단계로 실행 순서를 다시 나눠 보세요.'
        : `${next.card.actions[0]} 정도의 작은 단계로 다시 나누고, 멈추지 않는 것을 목표로 삼아 보세요.`,
    },
  ];

  const notes = [
    '심층 상담 결과도 시제품 예시예요. 적어 주신 선택지 이름과 고른 기준·제약은 그대로 반영했지만, 내용을 실제로 분석해 비교한 것은 아니에요.',
    ...base.notes.filter((n) => n !== SAMPLE_NOTE),
  ];

  return {
    ...base,
    kind: 'deep',
    criteriaSummary,
    recommendedOption: comparisons[0]?.option,
    comparisons,
    fitConditions,
    executionSteps,
    obstacles,
    notes,
    generatedAt,
  };
}

// ---------- 추가 심층 질문 ----------

export function buildSampleFollowUp(input: FollowUpInput): FollowUpAnswer {
  const { next } = resolveSpread(input.cards);
  const answer = [
    '질문을 접수했어요. 지금은 예시 결과라 질문 내용에 맞춘 답을 드리지는 못해요.',
    `정식 서비스에서는 선택하신 카드와 앞선 정리를 바탕으로 이 질문에 답해 드릴 예정이에요.`,
    `지금 참고할 수 있는 관점: 「${next.card.nameKo}」 — ${next.card.perspectives.next}`,
  ].join(' ');
  return { answer, isSample: true };
}

// ---------- 공통 ----------

function findAnswer(answers: Answer[], questionId: string): string | null {
  const answer = answers.find((a) => a.questionId === questionId);
  const value = answer?.value?.trim();
  return value ? value : null;
}

function findList(answers: Answer[], questionId: string): string[] {
  const answer = answers.find((a) => a.questionId === questionId);
  return (answer?.values ?? []).map((v) => v.trim()).filter(Boolean);
}

/** 받침 유무에 따라 '이에요' / '예요' 를 고릅니다. */
export function copula(word: string): string {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return '(이)에요';
  return (code - 0xac00) % 28 === 0 ? '예요' : '이에요';
}

/** 받침 유무에 따라 '을' / '를' 을 고릅니다. 한글이 아니면 '을(를)' 로 둡니다. */
export function objectParticle(word: string): string {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return '을(를)';
  return (code - 0xac00) % 28 === 0 ? '를' : '을';
}

function uniq(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}
