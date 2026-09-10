import { DeepReadingView } from '../../components/DeepReadingView';
import { FollowUpPanel } from '../../components/FollowUpPanel';
import { Notice } from '../../components/Notice';
import { ReadingView } from '../../components/ReadingView';
import { isRemoteAnalysis } from '../../services/analysis';
import { getDrawnCards } from '../../state/session';
import { ResultActions, ResultHeader, type ResultProps } from './ResultStep';

interface Props extends ResultProps {
  onAskFollowUp: (question: string) => Promise<void>;
}

/** 유료 심층 상담 결과 (체험) */
export function DeepResultStep(props: Props) {
  const { state, dispatch, onAskFollowUp } = props;
  const result = state.deepResult;

  if (!result) {
    return (
      <div className="screen">
        <Notice kind="error" role="alert">표시할 심층 결과가 없어요.</Notice>
        <button type="button" className="btn btn--secondary" onClick={() => dispatch({ type: 'goToStep', step: 'cards' })}>카드 화면으로</button>
      </div>
    );
  }

  return (
    <div className="screen">
      <ResultHeader plan="deep" isSample={result.isSample} generatedAt={result.generatedAt} concern={state.concern} />

      <ReadingView
        result={result}
        cards={getDrawnCards(state)}
        actionChecks={state.actionChecks}
        onToggleAction={(action) => dispatch({ type: 'toggleAction', action })}
      />
      <DeepReadingView result={result} deepAnswers={state.deepAnswers} />

      <FollowUpPanel followUps={state.followUps} onAsk={onAskFollowUp} />

      {state.result && (
        <p className="faint center">
          무료 기본 결과도 함께 보관돼요.{' '}
          <button type="button" className="link-button" onClick={() => dispatch({ type: 'goToStep', step: 'result' })}>기본 결과 보기</button>
        </p>
      )}

      <ResultActions {...props} supplementHint={isRemoteAnalysis ? '같은 카드와 답변에 보충 내용을 반영해 심층 결과를 다시 정리해요.' : '같은 카드와 답변으로 심층 결과를 다시 정리해요. 지금은 예시 결과라 보충 내용이 해석에 반영되지는 않고, 접수 사실만 표시돼요.'} />
    </div>
  );
}
