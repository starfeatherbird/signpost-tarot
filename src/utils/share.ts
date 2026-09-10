import { APP_NAME } from '../config/appConfig';
import { PLANS } from '../config/products';
import { getCard } from '../data/cards';
import { POSITION_BY_ID } from '../data/positions';
import { getStone } from '../data/stones';
import type { DeepReadingResult, DrawnCard, PlanId, ReadingResult } from '../domain/types';

interface ShareInput {
  plan: PlanId;
  concern: string;
  cards: DrawnCard[];
  result: ReadingResult | DeepReadingResult;
}

function isDeep(result: ReadingResult | DeepReadingResult): result is DeepReadingResult {
  return (result as DeepReadingResult).kind === 'deep';
}

/** 결과를 메신저·메모에 붙여 넣기 좋은 순수 텍스트로 만듭니다. */
export function buildShareText({ plan, concern, cards, result }: ShareInput): string {
  const cardLine = cards
    .map((c) => {
      const card = getCard(c.cardId);
      const name = card?.nameKo ?? c.cardId;
      return `${POSITION_BY_ID[c.positionId].title}: ${name}${c.reversed ? '(역방향)' : ''}`;
    })
    .join(' · ');
  const lines: string[] = [
    `[${APP_NAME} · ${PLANS[plan].name}]`,
    '',
    `고민: ${concern.trim()}`,
    `카드: ${cardLine}`,
    '',
    '■ 먼저 제안드리는 방향',
    result.priority,
    '',
    '■ 이렇게 제안하는 이유',
    ...result.reasons.map((r) => `- ${r}`),
    '',
    '■ 다른 선택이 나은 경우',
    ...result.alternatives.map((a) => `- ${a}`),
    '',
    '■ 지금 할 수 있는 일',
    ...result.actions.map((a) => `☐ ${a}`),
  ];
  if (isDeep(result)) {
    lines.push('', '■ 선택지 비교' + (result.recommendedOption ? ` (우선: ${result.recommendedOption})` : ''));
    for (const c of result.comparisons) {
      lines.push(`· ${c.option}`, ...c.benefits.map((b) => `  + ${b}`), ...c.burdens.map((b) => `  - ${b}`));
    }
    lines.push('', '■ 실행 순서', ...result.executionSteps.map((s, i) => `${i + 1}. ${s}`));
    lines.push('', '■ 예상 장애물과 대응', ...result.obstacles.map((o) => `- ${o.obstacle} → ${o.response}`));
  }
  const stone = result.stone ? getStone(result.stone.stoneId) : undefined;
  if (stone && result.stone) lines.push('', `■ 상징 스톤: ${stone.nameKo} (${stone.symbol})`, result.stone.promise);
  if (result.reflectionQuestion) lines.push('', '■ 며칠 뒤 돌아볼 질문', result.reflectionQuestion);
  lines.push('', `${result.isSample ? '시제품 예시 결과' : '타로 상징과 적어 주신 내용을 바탕으로 한 제안'}이에요. 최종 선택은 스스로 하실 수 있어요.`);
  return lines.join('\n');
}

/**
 * 텍스트를 공유합니다. 공유 창이 있으면 그것을, 없으면 클립보드 복사.
 * 사용자가 공유 창을 닫으면 'cancelled'.
 */
export async function shareText(text: string, title = APP_NAME): Promise<'shared' | 'copied' | 'cancelled'> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
      // 공유가 막힌 환경이면 복사로 넘어갑니다.
    }
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}
