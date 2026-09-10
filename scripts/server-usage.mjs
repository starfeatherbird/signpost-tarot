/**
 * 서버 사용 기록표(tarot_usage_log)를 터미널에서 봅니다. 실사용 기간에 비용·후계 전환·실패를 확인하는 용도.
 *   npm run server:usage            최근 14일 일별 요약 + 최근 7일 모델별 + 최근 실패 10건
 *   npm run server:usage -- 30      일수 지정
 * Supabase CLI 의 Management API 경로(db query --linked)를 쓰므로 `npx supabase login` 이 되어 있어야 합니다.
 * 고민 내용·결과 본문은 표에 없습니다.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PROJECT_REF = 'fvtarvatvqcozsrfetbf';
const days = Math.max(1, Number(process.argv[2]) || 14);
// SQL 을 인자로 넘기면 Windows 셸이 공백·괄호에서 쪼개므로 파일(-f)로 전달합니다.
const workDir = mkdtempSync(join(tmpdir(), 'tarot-usage-'));

function query(sql) {
  const file = join(workDir, 'q.sql');
  writeFileSync(file, sql, 'utf8');
  const out = execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['supabase', 'db', 'query', '--linked', '--project-ref', PROJECT_REF, '--output-format', 'json', '-f', file],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], shell: process.platform === 'win32' },
  );
  const start = out.indexOf('{');
  if (start < 0) throw new Error(`응답을 읽지 못했어요: ${out.slice(0, 200)}`);
  const parsed = JSON.parse(out.slice(start));
  return parsed.rows ?? [];
}

process.on('exit', () => rmSync(workDir, { recursive: true, force: true }));

function table(rows, columns) {
  if (rows.length === 0) { console.log('  (없음)'); return; }
  const widths = columns.map((c) => Math.max(c.label.length, ...rows.map((r) => String(r[c.key] ?? '-').length)));
  const line = (cells) => '  ' + cells.map((v, i) => String(v).padEnd(widths[i])).join('  ');
  console.log(line(columns.map((c) => c.label)));
  console.log(line(widths.map((w) => '-'.repeat(w))));
  for (const r of rows) console.log(line(columns.map((c) => r[c.key] ?? '-')));
}

console.log(`\n[사용 기록] 최근 ${days}일 · 일별 (한국 시간)`);
table(
  query(`select * from tarot_usage_daily where day >= (now() at time zone 'Asia/Seoul')::date - ${days - 1} order by day desc, kind`),
  [
    { key: 'day', label: '날짜' }, { key: 'kind', label: '종류' }, { key: 'calls', label: '호출' },
    { key: 'ok_calls', label: '성공' }, { key: 'failed_calls', label: '실패' }, { key: 'avg_seconds', label: '평균초' }, { key: 'users', label: '사용자' },
  ],
);

console.log(`\n[모델별] 최근 ${days}일 · 성공 건 기준`);
table(
  query(`select provider, model, prompt_version, count(*) as calls, round(avg(duration_ms)/1000.0, 1) as avg_seconds, sum(fallback_count) as fallbacks
         from tarot_usage_log where ok and created_at >= now() - interval '${days} days'
         group by provider, model, prompt_version order by calls desc`),
  [
    { key: 'provider', label: '제공자' }, { key: 'model', label: '모델' }, { key: 'prompt_version', label: '프롬프트' },
    { key: 'calls', label: '호출' }, { key: 'avg_seconds', label: '평균초' }, { key: 'fallbacks', label: '전환' },
  ],
);

console.log(`\n[최근 실패] 최대 10건`);
table(
  query(`select to_char(created_at at time zone 'Asia/Seoul', 'MM-DD HH24:MI') as at, kind, error_kind, provider, model, fallback_count
         from tarot_usage_log where not ok order by created_at desc limit 10`),
  [
    { key: 'at', label: '시각' }, { key: 'kind', label: '종류' }, { key: 'error_kind', label: '실패 종류' },
    { key: 'provider', label: '제공자' }, { key: 'model', label: '모델' }, { key: 'fallback_count', label: '전환' },
  ],
);
console.log('');
