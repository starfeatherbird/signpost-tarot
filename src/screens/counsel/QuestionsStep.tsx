import { useEffect, useState, type Dispatch } from 'react';
import { FlowTop } from '../../components/FlowTop';
import { LoadingSymbol } from '../../components/LoadingSymbol';
import { Notice } from '../../components/Notice';
import { ProgressHeader } from '../../components/ProgressHeader';
import { ANSWER_MAX_LENGTH } from '../../config/appConfig';
import type { Answer, Question } from '../../domain/types';
import { deepQuestionProvider, questionProvider } from '../../services/questions';
import type { SessionAction, SessionState, Step } from '../../state/session';

const UNKNOWN = '잘 모르겠어요';

interface Props {
  state: SessionState;
  dispatch: Dispatch<SessionAction>;
  /** basic: 기본 상황 확인 / deep: 심층 질문 */
  variant: 'basic' | 'deep';
  onCancel?: () => void;
  /** 아직 답하지 않은 질문에 미리 골라 둘 값 (예: 지난 상담의 "원하는 도움"). 질문 id → 값 */
  defaults?: Record<string, string>;
}

/**
 * 상황 확인 단계. 질문은 provider 가 결정하고, 이 화면은 한 번에 하나씩 보여 주기만 합니다.
 * 같은 화면을 기본 상황 확인과 심층 질문에 함께 씁니다.
 */
export function QuestionsStep({ state, dispatch, variant, onCancel, defaults = {} }: Props) {
  const isDeep = variant === 'deep';
  const provider = isDeep ? deepQuestionProvider : questionProvider;
  const answers = isDeep ? state.deepAnswers : state.answers;
  const index0 = isDeep ? state.deepQuestionIndex : state.questionIndex;
  const setIndex = (index: number) => dispatch(isDeep ? { type: 'setDeepQuestionIndex', index } : { type: 'setQuestionIndex', index });
  const saveAnswer = (answer: Answer) => dispatch(isDeep ? { type: 'deepAnswer', answer } : { type: 'answer', answer });

  const nextStep: Step = !isDeep && state.plan === 'deep' ? 'deepQuestions' : 'cards';
  const prevStep: Step = isDeep ? (state.result ? 'result' : 'questions') : 'input';

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setQuestions(null);
    provider
      .getQuestions(state.concern)
      .then((qs) => { if (active) setQuestions(qs); })
      .catch(() => { if (active) setLoadError('질문을 불러오지 못했어요.'); });
    return () => { active = false; };
  }, [provider, state.concern]);

  useEffect(() => {
    if (questions && questions.length === 0) dispatch({ type: 'goToStep', step: nextStep });
  }, [questions, dispatch, nextStep]);

  if (loadError) {
    return (
      <div className="screen">
        <Notice kind="error" role="alert">{loadError}</Notice>
        <div className="btn-pair">
          <button type="button" className="btn btn--secondary btn--sub" onClick={() => dispatch({ type: 'goToStep', step: prevStep })}>이전</button>
          <button type="button" className="btn btn--primary btn--sub" onClick={() => dispatch({ type: 'goToStep', step: nextStep })}>질문 없이 계속하기</button>
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="loading" aria-busy="true">
        <LoadingSymbol size={48} />
        <p className="muted">질문을 준비하고 있어요.</p>
      </div>
    );
  }

  const index = Math.min(index0, questions.length - 1);
  const question = questions[index];
  const existing = answers.find((a) => a.questionId === question.id);
  const isLast = index === questions.length - 1;

  const submit = (value: string | null, values?: string[]) => {
    saveAnswer({ questionId: question.id, questionText: question.text, value, values });
    if (isLast) dispatch({ type: 'goToStep', step: nextStep });
    else setIndex(index + 1);
  };

  const back = () => {
    if (index === 0) dispatch({ type: 'goToStep', step: prevStep });
    else setIndex(index - 1);
  };

  const lastLabel = isDeep
    ? (state.revealed ? '심층 결과 정리하기' : '카드 뽑으러 가기')
    : (state.plan === 'deep' ? '심층 질문으로' : '카드 뽑으러 가기');

  const form = {
    question, existing, isLast, onSubmit: submit, onBack: back,
    defaultValue: defaults[question.id],
    nextLabel: isLast ? lastLabel : '다음',
    header: (
      <>
        {onCancel && <FlowTop onCancel={onCancel} />}
        <ProgressHeader label={isDeep ? '심층 질문' : '상황 확인'} current={index + 1} total={questions.length} hint="답하지 않아도 진행할 수 있어요" />
      </>
    ),
  };

  return question.kind === 'list'
    ? <ListQuestionForm key={`${variant}-${question.id}`} {...form} />
    : <ChoiceQuestionForm key={`${variant}-${question.id}`} {...form} />;
}

interface FormProps {
  question: Question;
  existing?: Answer;
  /** 답이 없을 때 미리 골라 둘 선택지 (옵션에 있는 값만 적용) */
  defaultValue?: string;
  isLast: boolean;
  nextLabel: string;
  header: React.ReactNode;
  onSubmit: (value: string | null, values?: string[]) => void;
  onBack: () => void;
}

function NavButtons({ onNext, nextLabel, nextDisabled, onBack, onSkip }: { onNext: () => void; nextLabel: string; nextDisabled?: boolean; onBack: () => void; onSkip: () => void }) {
  return (
    <div className="btn-stack">
      <button type="button" className="btn btn--primary btn--block" onClick={onNext} disabled={nextDisabled}>{nextLabel}</button>
      <div className="btn-pair">
        <button type="button" className="btn btn--secondary btn--sub" onClick={onBack}>이전</button>
        <button type="button" className="btn btn--text btn--sub" onClick={onSkip}>건너뛰기</button>
      </div>
    </div>
  );
}

function ChoiceQuestionForm({ question, existing, defaultValue, nextLabel, header, onSubmit, onBack }: FormProps) {
  const existingValue = existing?.value ?? null;
  const existingIsOption = existingValue !== null && question.options.includes(existingValue);
  const skipLabel = question.skipLabel ?? UNKNOWN;
  const [choice, setChoice] = useState<string | null>(
    existing
      ? (existingIsOption ? existingValue : existingValue === null ? UNKNOWN : null)
      : (defaultValue && question.options.includes(defaultValue) ? defaultValue : null),
  );
  const [custom, setCustom] = useState(existing && !existingIsOption && existingValue ? existingValue : '');
  const customOver = custom.length > ANSWER_MAX_LENGTH;
  const customActive = custom.trim().length > 0;

  const handleNext = () => {
    if (customOver) return;
    if (customActive) return onSubmit(custom.trim());
    if (choice === UNKNOWN) return onSubmit(null);
    onSubmit(choice);
  };

  return (
    <div className="screen">
      {header}
      <h1 className="question-title">{question.text}</h1>
      {question.hint && <p className="muted" style={{ fontSize: 14 }}>{question.hint}</p>}

      <div className="chip-row" role="group" aria-label="선택지">
        {question.options.map((opt) => (
          <button key={opt} type="button" className="chip" aria-pressed={choice === opt && !customActive} onClick={() => { setChoice(opt); setCustom(''); }}>
            {opt}
          </button>
        ))}
        <button type="button" className={`chip ${choice === UNKNOWN && !customActive ? '' : 'chip--dashed'}`} aria-pressed={choice === UNKNOWN && !customActive} onClick={() => { setChoice(UNKNOWN); setCustom(''); }}>
          {skipLabel}
        </button>
      </div>

      {question.allowCustom && (
        <div className="field">
          <label className="field-label" htmlFor={`custom-${question.id}`}>직접 적기 (선택)</label>
          <input
            id={`custom-${question.id}`}
            className="text-input"
            type="text"
            value={custom}
            placeholder="내 말로 적어도 좋아요"
            onChange={(e) => setCustom(e.target.value)}
            aria-invalid={customOver || undefined}
          />
          {customOver && <p className="field-error">{ANSWER_MAX_LENGTH}자 이내로 줄여 주세요.</p>}
        </div>
      )}

      <NavButtons onNext={handleNext} nextLabel={nextLabel} nextDisabled={customOver} onBack={onBack} onSkip={() => onSubmit(null)} />
    </div>
  );
}

/** 짧은 항목을 여러 개 적는 질문 (예: 선택지 2~3개) — 번호 칸 + 입력 행 */
function ListQuestionForm({ question, existing, nextLabel, header, onSubmit, onBack }: FormProps) {
  const max = question.maxItems ?? 3;
  const min = question.minItems ?? 1;
  const initial = existing?.values?.length ? existing.values : [];
  const [items, setItems] = useState<string[]>(() => {
    const filled = [...initial];
    while (filled.length < Math.max(min, 2)) filled.push('');
    return filled.slice(0, max);
  });
  const filled = items.map((v) => v.trim()).filter(Boolean);
  const anyOver = items.some((v) => v.length > ANSWER_MAX_LENGTH);
  const enough = filled.length >= 1;

  const update = (i: number, value: string) => setItems((prev) => prev.map((v, j) => (j === i ? value : v)));

  return (
    <div className="screen">
      {header}
      <h1 className="question-title">{question.text}</h1>
      <p className="muted" style={{ fontSize: 14 }}>{question.hint ?? '한 줄씩 짧게 적어도 충분해요.'}</p>

      <div className="field" role="group" aria-label="선택지 목록">
        {items.map((value, i) => (
          <div className="numbered-input" key={i}>
            <span className="num-box" aria-hidden="true">{i + 1}</span>
            <label className="visually-hidden" htmlFor={`${question.id}-${i}`}>선택지 {i + 1}</label>
            <input
              id={`${question.id}-${i}`}
              className="text-input"
              type="text"
              value={value}
              placeholder={i === 0 ? '예) 지금 회사에 남기' : i === 1 ? '예) 이직 준비하기' : '예) 잠시 쉬기'}
              onChange={(e) => update(i, e.target.value)}
              aria-invalid={value.length > ANSWER_MAX_LENGTH || undefined}
            />
          </div>
        ))}
        {items.length < max && (
          <button type="button" className="btn btn--dashed btn--block" onClick={() => setItems((p) => [...p, ''])}>+ 선택지 하나 더 적기</button>
        )}
        {anyOver && <p className="field-error">항목당 {ANSWER_MAX_LENGTH}자 이내로 줄여 주세요.</p>}
      </div>

      <NavButtons
        onNext={() => onSubmit(filled.join(' / '), filled)}
        nextLabel={nextLabel}
        nextDisabled={!enough || anyOver}
        onBack={onBack}
        onSkip={() => onSubmit(null, [])}
      />
    </div>
  );
}
