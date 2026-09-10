import type { CardPosition, PositionId } from '../domain/types';

/** 세 자리의 의미. 순서대로 1·2·3번째 선택 카드에 대응합니다. */
export const POSITIONS: CardPosition[] = [
  { id: 'core', index: 0, title: '현재의 핵심', description: '고민의 중심' },
  { id: 'blindspot', index: 1, title: '놓치고 있는 관점', description: '아직 못 본 시선' },
  { id: 'next', index: 2, title: '다음 움직임', description: '해 볼 수 있는 방향' },
];

export const POSITION_BY_ID: Record<PositionId, CardPosition> = Object.fromEntries(
  POSITIONS.map((p) => [p.id, p]),
) as Record<PositionId, CardPosition>;

export const CARDS_TO_PICK = POSITIONS.length;
