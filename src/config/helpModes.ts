import type { Answer } from '../domain/types';

/**
 * "원하는 도움" 선택지. 같은 고민이라도 원하는 도움에 따라 결과의 무게가 달라집니다.
 * 상황 확인의 첫 질문(id 'help')으로 묻고, 답의 문구(label)가 그대로 서버로 전달됩니다.
 * 서버 프롬프트(supabase/functions/_shared/prompt.ts)도 같은 문구로 모드를 알아보므로 함께 고쳐야 합니다.
 */
export type HelpModeId = 'settle' | 'compare' | 'act';

export interface HelpMode {
  id: HelpModeId;
  label: string;
  /** 결과 상단 태그 등 짧은 표기 */
  short: string;
}

export const HELP_QUESTION_ID = 'help';

export const HELP_MODES: HelpMode[] = [
  { id: 'settle', label: '마음을 먼저 정리하기', short: '마음 정리' },
  { id: 'compare', label: '선택지를 비교하기', short: '선택지 비교' },
  { id: 'act', label: '오늘 할 일 정하기', short: '오늘 할 일' },
];

/** 답변 목록에서 원하는 도움을 찾습니다. 건너뛰었거나 예전 기록이면 null */
export function getHelpMode(answers: Answer[]): HelpMode | null {
  const value = answers.find((a) => a.questionId === HELP_QUESTION_ID)?.value?.trim();
  if (!value) return null;
  return HELP_MODES.find((m) => m.label === value) ?? null;
}
