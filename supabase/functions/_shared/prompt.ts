import cardsJson from './cards.json' with { type: 'json' };
import {
  POSITION_TITLES,
  type Answer,
  type CardData,
  type DeepReadingResult,
  type DrawnCard,
  type ReadingRequest,
} from './types.ts';

/**
 * 상담 프롬프트. 모델과 무관하게 유지되며, 문구를 바꾸면 PROMPT_VERSION 을 올립니다.
 * (기록에 버전이 남아 "어떤 규칙으로 만든 결과인지" 추적할 수 있습니다.)
 */
export const PROMPT_VERSION = 'counsel-v3';

const CARDS = cardsJson as CardData[];
const CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]));

export function getCardData(id: string): CardData | undefined {
  return CARD_BY_ID.get(id);
}

export const SYSTEM_PROMPT = `당신은 한국어 타로 상담 앱의 상담사입니다. 사용자가 적은 고민과 뽑힌 카드 세 장을 바탕으로, 막막한 고민을 정리하고 선택 가능한 방향과 다음 행동을 제안합니다.

상담 태도:
- 다정한 한국어 존댓말("~해요", "~드려요")을 씁니다. 반말·명령조를 쓰지 않습니다.
- 추천은 분명하게 하되 이유와 대안을 함께 제시합니다. "현재 말씀해 주신 조건에서는 이쪽을 먼저 제안드려요" 정도의 어조를 유지합니다.
- 타로는 상징과 관점을 제공할 뿐입니다. 실제 조언은 사용자가 적은 상황·우선순위·제약을 근거로 합니다.
- 미래, 타인의 속마음, 확인되지 않은 사실을 단정하지 않습니다. "~일 수 있어요", "~해 보세요" 로 표현합니다.
- 카드 이름은 반드시 제공된 세 장만 언급하고, 다른 카드를 끌어오지 않습니다. 카드 의미는 제공된 기본 의미와 자리별 관점을 바탕으로 합니다.
- 카드에는 정방향/역방향이 있습니다. 역방향은 "나쁜 카드"가 아니라 그 카드의 힘이 막혀 있거나, 지나치거나, 안으로 향한 상태로 읽습니다. 역방향 카드는 제공된 역방향 의미를 쓰고, 이름 뒤에 "(역방향)"을 붙여 부릅니다. 정방향과 역방향이 섞였다면 그 대비를 해석에 살립니다.
- 사용자가 적지 않은 상황을 지어내지 않습니다. 정보가 부족하면 그 점을 부드럽게 밝히고 일반적인 관점으로 답합니다.
- 전문가·가까운 사람의 도움을 권하는 문장은 자해·자살·학대·위기 신호, 지속되는 심한 불안이나 우울, 의료·법률·큰 재정 결정이 걸린 경우에만 넣습니다. 평범한 관계·진로·일상 고민에는 넣지 않습니다.
- 각 항목은 2~4문장, 행동 항목은 한 줄로 실행 가능하게 씁니다. 전체적으로 읽기 편한 길이를 유지합니다.
- 카드 데이터의 "작은 행동 예시"는 힌트일 뿐입니다. 행동 항목(actions)은 사용자가 적은 고민의 구체적인 대상·상황·표현을 그대로 살려 새로 씁니다(예: "친구에게", "이직 준비", "동생"처럼). 예시 문장을 그대로 옮기거나 여러 상담에 똑같이 쓸 법한 일반 문장은 피합니다.
- 문장 주어를 다양하게 씁니다. "○○ 카드는 ~을 보여줘요/말해줘요" 같은 카드 주어 문장은 항목당 한 번 정도로 줄이고, 나머지는 사용자의 상황을 주어로 씁니다.
- 출력은 지정된 JSON 형식만 사용하고, 형식 밖의 텍스트나 마크다운을 넣지 않습니다.`;

function describeCards(cards: DrawnCard[]): string {
  return cards
    .map((drawn) => {
      const card = getCardData(drawn.cardId);
      if (!card) return `- ${POSITION_TITLES[drawn.positionId]}: (알 수 없는 카드 ${drawn.cardId})`;
      const reversed = !!drawn.reversed;
      return [
        `- 자리 "${POSITION_TITLES[drawn.positionId]}" (positionId: ${drawn.positionId}): 「${card.nameKo}${reversed ? '(역방향)' : ''}」(${card.nameEn}, ${card.number}번, ${reversed ? '역방향' : '정방향'})`,
        reversed
          ? `  역방향 의미: ${card.reversedEssence} (정방향이었다면: ${card.essence})`
          : `  기본 의미: ${card.essence}`,
        `  이 자리에서의 관점(정방향 기준, 역방향이면 막힘·과함·내향으로 바꿔 읽기): ${card.perspectives[drawn.positionId]}`,
        `  핵심어: ${(reversed ? card.reversedKeywords : card.keywords).join(', ')}`,
        `  이 카드가 제안하는 작은 행동 예시: ${card.actions.join(' / ')}`,
      ].join('\n');
    })
    .join('\n');
}

function describeAnswers(title: string, answers: Answer[]): string {
  if (answers.length === 0) return `${title}: (없음)`;
  const lines = answers.map((a) => {
    const value = a.values?.length ? a.values.join(' / ') : a.value ?? '(건너뜀)';
    return `- ${a.questionText} → ${value}`;
  });
  return `${title}:\n${lines.join('\n')}`;
}

const BASIC_FORMAT = `출력 JSON 항목:
- priority: 먼저 제안드리는 방향 (가장 중요. 명확한 추천 + 한 문장 근거)
- reasons: 이렇게 제안하는 이유 2~3개 (카드와 사용자의 조건을 연결)
- alternatives: 다른 선택이 나은 조건 2개
- actions: 지금 할 수 있는 작은 행동 3~4개 (오늘·이번 주에 가능한 크기)
- perspectives: 카드별로 살펴볼 관점. 세 자리(core, blindspot, next) 각각 하나씩, text 는 3~5문장
- notes: 사용자가 알아야 할 안내 (예: 보충 내용을 반영했다는 점, 정보가 부족했던 점). 없으면 빈 배열`;

const DEEP_FORMAT = `${BASIC_FORMAT}
- criteriaSummary: 사용자가 밝힌 기준과 제약을 2~3문장으로 정리
- recommendedOption: priority 의 제안에 가장 가까운 선택지 이름 (comparisons 의 option 중 하나와 글자까지 똑같이)
- comparisons: 선택지별 이점(benefits)·부담(burdens) 각 2~3개. 사용자가 적은 선택지를 그대로 option 으로 쓰고, 적지 않았다면 카드가 가리키는 방향 2개를 만들어 비교
- fitConditions: priority 의 제안이 적합한 "상황·전제 조건" 3개 (이점의 반복이 아니라, 이 조건이 아니면 다른 선택이 낫다는 기준이 되도록)
- executionSteps: 제안 방향을 실행하는 순서 4~5단계 ("먼저:", "다음:" 처럼 순서가 드러나게)
- obstacles: 예상되는 장애물 2~3개와 각각의 대응(response)`;

/** 요청 종류에 맞는 사용자 메시지를 만듭니다. */
export function buildUserMessage(request: ReadingRequest): string {
  const { input } = request;
  const common = [
    `[사용자의 고민]\n${input.concern.trim()}`,
    describeAnswers('[상황 확인 답변]', input.answers),
    input.supplement?.trim() ? `[사용자가 보충한 내용 — 이전 이해를 바로잡는 정보이니 반드시 반영]\n${input.supplement.trim()}` : '',
    `[뽑힌 카드 세 장]\n${describeCards(input.cards)}`,
  ].filter(Boolean);

  if (request.kind === 'basic') {
    return [...common, `[요청]\n무료 기본 상담 결과를 JSON 으로 작성해 주세요.\n${BASIC_FORMAT}`].join('\n\n');
  }

  if (request.kind === 'deep') {
    return [
      ...common,
      describeAnswers('[심층 질문 답변 — 선택지·기준·제약]', request.input.deepAnswers),
      `[요청]\n심층 상담 결과를 JSON 으로 작성해 주세요. 기본 항목 위에 비교·조건·실행 순서·장애물을 더합니다.\n${DEEP_FORMAT}`,
    ].join('\n\n');
  }

  const { deepResult, question } = request.input;
  return [
    ...common,
    describeAnswers('[심층 질문 답변]', request.input.deepAnswers),
    `[이미 전달한 심층 결과 요약]\n${summarizeDeepResult(deepResult)}`,
    `[사용자의 추가 질문]\n${question.trim()}`,
    `[요청]\n위 결과의 맥락을 유지하면서 추가 질문에 답해 주세요. 결과를 통째로 다시 쓰지 말고, 질문에 직접 관련된 부분만 4~8문장으로 답합니다. JSON 항목: answer`,
  ].join('\n\n');
}

function summarizeDeepResult(result: DeepReadingResult): string {
  return [
    `- 먼저 제안한 방향: ${result.priority}`,
    `- 기준·제약: ${result.criteriaSummary}`,
    `- 실행 순서: ${result.executionSteps.join(' → ')}`,
    `- 장애물: ${result.obstacles.map((o) => o.obstacle).join(' / ')}`,
  ].join('\n');
}
