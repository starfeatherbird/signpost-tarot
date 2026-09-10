/**
 * 화면 캡처용 상태 목록(%TMP%/capture-targets.json)을 만듭니다.
 * 실제 결과 예시가 %TMP%/res-basic.txt, res2-deep.txt, res2-followup.txt (curl 응답) 에 있으면 그 내용을 쓰고,
 * 없으면 짧은 예시 문장으로 채웁니다. 이후 `node scripts/capture-screens.mjs` 를 실행하세요.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const tmp = process.env.TMP ?? '.';
const readBody = (file) => {
  const p = resolve(tmp, file);
  if (!existsSync(p)) return null;
  const t = readFileSync(p, 'utf8');
  try { return JSON.parse(t.slice(0, t.lastIndexOf('\nHTTP'))).result; } catch { return null; }
};
const readJson = (file) => {
  const p = resolve(tmp, file);
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
};

const concern = '친구에게 서운한 마음을 말할지 고민돼요. 말하면 관계가 어색해질까 봐 걱정이에요.';
const answers = [
  { questionId: 'priority', questionText: '이번 고민에서 가장 지키고 싶은 것은 무엇인가요?', value: '관계' },
  { questionId: 'constraint', questionText: '선택하기 어렵게 만드는 조건이 있나요?', value: '주변 사람의 반응' },
];
const deepAnswers = readJson('req-deep.json')?.input?.deepAnswers ?? [
  { questionId: 'options', questionText: '지금 고려하고 있는 선택지를 2~3개 적어 주세요.', value: '솔직하게 말하기 / 조금 더 지켜보기', values: ['친구에게 솔직하게 말하기', '조금 더 지켜보기'] },
  { questionId: 'criteria', questionText: '결정할 때 가장 중요하게 보는 기준은 무엇인가요?', value: '관계 유지' },
  { questionId: 'constraints', questionText: '현실적으로 꼭 고려해야 하는 제약이 있나요?', value: '함께 결정할 사람이 있어요' },
];

const fallbackBasic = {
  priority: '서운했던 마음을 친구에게 직접, 부드럽게 전달해 보시는 방향을 먼저 제안드려요.',
  reasons: ['이유 예시 1', '이유 예시 2'], alternatives: ['대안 예시'], actions: ['오늘 할 수 있는 일 예시', '이번 주에 할 일 예시'],
  perspectives: [
    { cardId: 'tower', positionId: 'core', text: '관점 예시' },
    { cardId: 'lovers', positionId: 'blindspot', text: '관점 예시' },
    { cardId: 'world', positionId: 'next', text: '관점 예시' },
  ],
  isSample: false, notes: [], generatedAt: '2026-09-10T01:00:00.000Z',
};
const basic = readBody('res-basic.txt') ?? fallbackBasic;
const deep = readBody('res2-deep.txt') ?? {
  ...basic, kind: 'deep', criteriaSummary: '기준 요약 예시', recommendedOption: '친구에게 솔직하게 말하기',
  comparisons: [
    { option: '친구에게 솔직하게 말하기', benefits: ['이점 예시'], burdens: ['부담 예시'] },
    { option: '조금 더 지켜보기', benefits: ['이점 예시'], burdens: ['부담 예시'] },
  ],
  fitConditions: ['조건 예시'], executionSteps: ['먼저: 단계 예시', '다음: 단계 예시'], obstacles: [{ obstacle: '장애물 예시', response: '대응 예시' }],
};
const followUpAnswer = readBody('res2-followup.txt')?.answer ?? '추가 질문 응답 예시입니다.';

const ids = ['fool', 'magician', 'high-priestess', 'empress', 'emperor', 'hierophant', 'lovers', 'chariot', 'strength', 'hermit', 'wheel-of-fortune', 'justice', 'hanged-man', 'death', 'temperance', 'devil', 'tower', 'star', 'moon', 'sun', 'judgement', 'world'];
const deck = [...ids].sort((a, b) => (a.charCodeAt(1) * 7 + a.length) % 13 - (b.charCodeAt(1) * 7 + b.length) % 13 || a.localeCompare(b));
const cards = [{ cardId: 'tower', positionId: 'core' }, { cardId: 'lovers', positionId: 'blindspot', reversed: true }, { cardId: 'world', positionId: 'next' }];

const base = {
  consultationId: 'seed-demo', plan: 'basic', deepIntroMode: 'start', concern,
  questionIndex: 0, answers: [], deepQuestionIndex: 0, deepAnswers: [], deck,
  reversedIds: ['lovers'], selected: [], revealed: false, supplement: '', result: null, deepResult: null, followUps: [], actionChecks: [],
  rateLimitedUntil: null, savedRecordId: null, savedVersion: null, analysisStatus: 'idle', analysisError: null, step: 'input',
};
const withAnswers = { ...base, answers, questionIndex: 1 };
const picked = { ...withAnswers, step: 'cards', selected: ['tower'] };
const revealed = { ...withAnswers, step: 'cards', selected: ['tower', 'lovers', 'world'], revealed: true };
const result = { ...revealed, step: 'result', result: basic, actionChecks: [basic.actions[0]] };
const followUps = [{ question: '첫 단계를 이번 주에 하기 어렵다면 어떻게 시작하면 좋을까요?', answer: followUpAnswer, isSample: false, askedAt: '2026-09-10T01:00:00.000Z' }];
const deepRes = { ...revealed, plan: 'deep', deepIntroMode: 'upgrade', deepAnswers, step: 'deepResult', result: basic, deepResult: deep, followUps };
const records = [
  { id: 'r1', consultationId: 'c1', createdAt: '2026-09-10T01:20:00.000Z', updatedAt: '2026-09-10T01:20:00.000Z', plan: 'deep', concern, answers, deepAnswers, cards, result: basic, deepResult: deep, followUps, actionChecks: [], isSample: false, followUpMemo: '' },
  { id: 'r2', consultationId: 'c2', createdAt: '2026-09-09T09:05:00.000Z', updatedAt: '2026-09-09T09:05:00.000Z', plan: 'basic', concern: '지금 회사에 남을지, 이직을 할지 고민돼요. 조건은 나쁘지 않은데 마음이 자꾸 흔들려요.', answers: [answers[0]], deepAnswers: [], cards: [{ cardId: 'fool', positionId: 'core' }, { cardId: 'chariot', positionId: 'blindspot' }, { cardId: 'star', positionId: 'next' }], result: { ...basic, priority: '지금 자리를 바로 떠나기보다, 이직 준비를 작은 단위로 시작하며 기회를 살펴보는 쪽을 먼저 제안드려요.' }, deepResult: null, followUps: [], actionChecks: [], isSample: false, followUpMemo: '결국 이력서를 정리하기 시작했어요.' },
];
const limited = { ...base, rateLimitedUntil: new Date(Date.now() + 3600e3).toISOString() };

const keys = { draft: 'tarot-counsel.draft.v1', records: 'tarot-counsel.records.v1', theme: 'tarot-counsel.theme.v1' };
const targets = [];
const add = (name, theme, extra) => targets.push({ name, theme, ...extra });
add('A01-plan', 'dark', { draft: { ...base, step: 'plan' } });
add('A02-input', 'dark', { draft: base });
add('A03-questions', 'dark', { draft: { ...base, step: 'questions' } });
add('A04-deep-questions', 'dark', { draft: { ...withAnswers, plan: 'deep', step: 'deepQuestions' } });
add('A05-deep-intro', 'dark', { draft: { ...base, plan: 'deep', step: 'deepIntro' } });
add('A06-cards', 'dark', { draft: picked });
add('A07-reveal', 'dark', { draft: revealed });
add('A09-result', 'dark', { draft: result });
add('A10-deep-result', 'dark', { draft: deepRes });
add('A11-records', 'dark', { draft: { ...base, step: 'plan' }, records, tab: 'records' });
add('A11b-records-empty', 'dark', { draft: { ...base, step: 'plan' }, records: [], tab: 'records' });
add('A12-record-detail', 'dark', { draft: { ...base, step: 'plan' }, records, tab: 'records', open: 0 });
add('A13-space', 'dark', { draft: { ...base, step: 'plan' }, records, tab: 'space' });
add('A14-limit', 'dark', { draft: limited });
add('B01-plan', 'light', { draft: { ...base, step: 'plan' } });
add('B06-cards', 'light', { draft: picked });
add('B09-result', 'light', { draft: result });
add('B10-deep-result', 'light', { draft: deepRes });

writeFileSync(resolve(tmp, 'capture-targets.json'), JSON.stringify({ keys, targets }), 'utf8');
console.log(`[targets] ${targets.length}개 → ${resolve(tmp, 'capture-targets.json')}`);
