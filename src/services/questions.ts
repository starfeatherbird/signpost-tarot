import type { Question } from '../domain/types';

/**
 * 상황 확인 질문 제공자.
 * 지금은 입력과 무관한 공통 질문을 돌려주지만, 나중에 분석 서비스가 고민을 읽고
 * 필요한 질문만 만들거나(또는 생략하거나) 하도록 같은 인터페이스로 교체할 수 있습니다.
 */
export interface QuestionProvider {
  getQuestions(concern: string): Promise<Question[]>;
}

/** 무료·심층 공통: 기본 상황 확인 */
const BASIC_QUESTIONS: Question[] = [
  {
    id: 'priority',
    kind: 'choice',
    text: '이번 고민에서 가장 지키고 싶은 것은 무엇인가요?',
    options: ['관계', '마음의 평온', '성장·기회', '안정·현실', '시간·에너지'],
    allowCustom: true,
  },
  {
    id: 'constraint',
    kind: 'choice',
    text: '선택하기 어렵게 만드는 조건이 있나요?',
    options: ['시간이 부족해요', '비용·현실적 부담', '주변 사람의 반응', '실패에 대한 걱정', '정보가 부족해요'],
    allowCustom: true,
  },
];

/** 심층 상담 추가 질문: 선택지·기준·제약 */
const DEEP_QUESTIONS: Question[] = [
  {
    id: 'options',
    kind: 'list',
    text: '지금 고려하고 있는 선택지를 2~3개 적어 주세요.',
    hint: '예) 지금 회사에 남기 / 이직 준비하기 / 잠시 쉬기',
    options: [],
    allowCustom: true,
    minItems: 2,
    maxItems: 3,
  },
  {
    id: 'criteria',
    kind: 'choice',
    text: '결정할 때 가장 중요하게 보는 기준은 무엇인가요?',
    options: ['장기적인 만족', '당장의 안정', '관계 유지', '성장 가능성', '후회를 줄이는 것'],
    allowCustom: true,
  },
  {
    id: 'constraints',
    kind: 'choice',
    text: '현실적으로 꼭 고려해야 하는 제약이 있나요?',
    options: ['기한이 정해져 있어요', '비용 한도가 있어요', '함께 결정할 사람이 있어요', '되돌리기 어려운 선택이에요', '특별히 없어요'],
    allowCustom: true,
  },
];

export const staticQuestionProvider: QuestionProvider = {
  async getQuestions() {
    return BASIC_QUESTIONS;
  },
};

export const staticDeepQuestionProvider: QuestionProvider = {
  async getQuestions() {
    return DEEP_QUESTIONS;
  },
};

/** 앱에서 사용하는 질문 제공자. 교체 시 이 두 줄만 바꿉니다. */
export const questionProvider: QuestionProvider = staticQuestionProvider;
export const deepQuestionProvider: QuestionProvider = staticDeepQuestionProvider;
