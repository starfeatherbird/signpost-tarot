/**
 * 골든 세트(eval/golden-set.json)를 배포된 서버 함수에 보내 결과를 파일로 모읍니다.
 * 프롬프트·모델을 바꾼 전후를 같은 입력으로 비교하는 용도입니다. (한 번 돌릴 때 실제 AI 비용 발생)
 *
 * 사용:
 *   node scripts/run-golden.mjs --label v1            기본 상담 전부
 *   node scripts/run-golden.mjs --label v1 --deep     심층 데이터가 있는 케이스는 심층으로
 *   node scripts/run-golden.mjs --label v1 --only job-change
 * 결과: eval/runs/<날짜>-<label>/<케이스>.md + summary.md
 * 서버 주소·anon 키는 .env 에서 읽습니다. 호출 횟수 제한(시간당 20회)에 걸리면 잠시 뒤 다시 실행하세요.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };

const env = Object.fromEntries(
  readFileSync(resolve(root, '.env'), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => l.split('=').map((s) => s.trim())),
);
const endpoint = `${env.VITE_SUPABASE_URL}/functions/v1/tarot-reading`;
const anon = env.VITE_SUPABASE_ANON_KEY;
if (!env.VITE_SUPABASE_URL || !anon) { console.error('.env 에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 필요해요.'); process.exit(1); }

const set = JSON.parse(readFileSync(resolve(root, 'eval', 'golden-set.json'), 'utf8'));
const label = opt('--label', 'run');
const only = opt('--only', null);
const useDeep = flag('--deep');
const cases = set.cases.filter((c) => (!only || c.id.includes(only)) && (!useDeep || c.deep)); // --deep 이면 심층 데이터가 있는 케이스만

const QUESTION_TEXT = {
  priority: '이번 고민에서 가장 지키고 싶은 것은 무엇인가요?',
  constraint: '선택하기 어렵게 만드는 조건이 있나요?',
  options: '지금 고려하고 있는 선택지를 2~3개 적어 주세요.',
  criteria: '결정할 때 가장 중요하게 보는 기준은 무엇인가요?',
  constraints: '현실적으로 꼭 고려해야 하는 제약이 있나요?',
};
const POS = ['core', 'blindspot', 'next'];

function buildRequest(c) {
  const answers = Object.entries(c.answers ?? {}).map(([id, value]) => ({ questionId: id, questionText: QUESTION_TEXT[id], value }));
  // 카드 ID 뒤에 ! 를 붙이면 역방향 (예: "tower!")
  const cards = c.cards.map((raw, i) => ({ cardId: raw.replace(/!$/, ''), positionId: POS[i], reversed: raw.endsWith('!') }));
  const input = { concern: c.concern, answers, cards };
  if (useDeep && c.deep) {
    const d = c.deep;
    input.deepAnswers = [
      { questionId: 'options', questionText: QUESTION_TEXT.options, value: d.options.join(' / '), values: d.options },
      { questionId: 'criteria', questionText: QUESTION_TEXT.criteria, value: d.criteria },
      { questionId: 'constraints', questionText: QUESTION_TEXT.constraints, value: d.constraints },
    ];
    return { kind: 'deep', input };
  }
  return { kind: 'basic', input };
}

function toMarkdown(c, req, res, ms) {
  const r = res.result;
  const lines = [
    `# ${c.title} (${c.id})`, '',
    `- 종류: ${req.kind} · 모델: ${r.source?.provider}/${r.source?.model} · 프롬프트: ${r.source?.promptVersion} · ${(ms / 1000).toFixed(1)}s`,
    `- 고민: ${c.concern}`,
    `- 답변: ${req.input.answers.map((a) => `${a.questionId}=${a.value ?? '(건너뜀)'}`).join(', ')}`,
    `- 카드: ${c.cards.map((x) => x.endsWith('!') ? x.slice(0, -1) + '(역방향)' : x).join(' · ')}`, '',
    '## 1. 먼저 제안드리는 방향', r.priority, '',
    '## 2. 이렇게 제안하는 이유', ...r.reasons.map((x) => `- ${x}`), '',
    '## 3. 다른 선택이 나은 경우', ...r.alternatives.map((x) => `- ${x}`), '',
    '## 4. 지금 할 수 있는 일', ...r.actions.map((x) => `- [ ] ${x}`), '',
    '## 5. 카드별 관점', ...r.perspectives.map((p) => `- **${p.positionId} · ${p.cardId}**: ${p.text}`), '',
  ];
  if (r.stone) lines.push('## 상징 스톤', `- ${r.stone.stoneId}: ${r.stone.promise}`, '');
  if (r.reflectionQuestion) lines.push('## 돌아볼 질문', r.reflectionQuestion, '');
  if (r.notes?.length) lines.push('## 안내', ...r.notes.map((x) => `- ${x}`), '');
  if (req.kind === 'deep') {
    lines.push('## 6. 기준과 제약', r.criteriaSummary, '', `## 7. 선택지 비교 (우선: ${r.recommendedOption ?? '-'})`);
    for (const cmp of r.comparisons) lines.push(`### ${cmp.option}`, ...cmp.benefits.map((x) => `- 이점: ${x}`), ...cmp.burdens.map((x) => `- 부담: ${x}`));
    lines.push('', '## 8. 적합한 조건', ...r.fitConditions.map((x) => `- ${x}`), '', '## 9. 실행 순서', ...r.executionSteps.map((x, i) => `${i + 1}. ${x}`), '', '## 10. 장애물과 대응', ...r.obstacles.map((o) => `- **${o.obstacle}** → ${o.response}`), '');
  }
  return lines.join('\n');
}

const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/(\d{8})(\d{4})/, '$1-$2');
const outDir = resolve(root, 'eval', 'runs', `${stamp}-${label}`);
mkdirSync(outDir, { recursive: true });
const summary = [`# 골든 세트 실행: ${label} (${new Date().toLocaleString('ko-KR')})`, '', '| 케이스 | 종류 | 모델 | 시간 | 글자 수 | 우선 제안(앞부분) |', '|---|---|---|---|---|---|'];

for (const c of cases) {
  const req = buildRequest(c);
  const t0 = Date.now();
  let res;
  try {
    const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8', apikey: anon, Authorization: `Bearer ${anon}` }, body: JSON.stringify(req) });
    res = await r.json();
    if (!r.ok || !res.result) throw new Error(res.error ?? `HTTP ${r.status}`);
  } catch (err) {
    console.log(`✗ ${c.id}: ${err.message}`);
    summary.push(`| ${c.id} | ${req.kind} | - | - | - | 실패: ${err.message} |`);
    continue;
  }
  const ms = Date.now() - t0;
  const md = toMarkdown(c, req, res, ms);
  writeFileSync(resolve(outDir, `${c.id}.md`), md, 'utf8');
  const chars = JSON.stringify(res.result).length;
  console.log(`✓ ${c.id} (${req.kind}) ${(ms / 1000).toFixed(1)}s ${res.result.source?.model}`);
  summary.push(`| ${c.id} | ${req.kind} | ${res.result.source?.model} | ${(ms / 1000).toFixed(0)}s | ${chars} | ${res.result.priority.slice(0, 40)}… |`);
}
writeFileSync(resolve(outDir, 'summary.md'), summary.join('\n') + '\n', 'utf8');
console.log(`\n결과: ${outDir}`);
if (!existsSync(resolve(root, 'eval', 'runs', '.gitignore'))) writeFileSync(resolve(root, 'eval', 'runs', '.gitignore'), '*\n!.gitignore\n');
