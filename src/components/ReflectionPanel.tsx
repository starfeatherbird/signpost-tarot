import { REFLECTION_AFTER_DAYS } from '../config/appConfig';

interface Props {
  question: string;
}

/** 결과 화면: 며칠 뒤 돌아볼 질문을 미리 보여 줍니다. 답은 기록장에서 남깁니다. */
export function ReflectionPanel({ question }: Props) {
  return (
    <section className="panel panel--reflection" aria-labelledby="sec-reflection">
      <h2 className="panel-title" id="sec-reflection">며칠 뒤 돌아볼 질문</h2>
      <p className="reflection-question">{question}</p>
      <p className="text-muted" style={{ fontSize: 13 }}>
        기록을 저장해 두면 {REFLECTION_AFTER_DAYS}일 뒤부터 기록장에서 이 질문에 답할 수 있어요.
      </p>
    </section>
  );
}
