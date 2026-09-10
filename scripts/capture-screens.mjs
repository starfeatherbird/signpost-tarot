/**
 * 개발 서버 화면을 모바일 크기(375px, 2배 해상도)로 전체 페이지 캡처합니다. (디자인 시안·문서용)
 * 사용: npm run dev 를 켜 둔 상태에서
 *   node scripts/make-capture-targets.mjs   → %TMP%/capture-targets.json (화면별 localStorage 상태·테마)
 *   node scripts/capture-screens.mjs        → docs/screens/*.png
 * Chrome 이 설치되어 있어야 하며, 외부 패키지는 쓰지 않습니다 (Node 22+ 의 내장 WebSocket 사용).
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(here, '..', 'docs', 'screens');
const BASE = process.env.CAPTURE_BASE ?? 'http://localhost:5173';
const PORT = 9333;
const WIDTH = 375;
const SCALE = 2;
const tmp = process.env.TMP ?? '.';

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe` : '',
];
const chromePath = CHROME_CANDIDATES.find((p) => p && existsSync(p));
if (!chromePath) {
  console.error('Chrome 을 찾지 못했어요.');
  process.exit(1);
}

const targetsFile = resolve(tmp, 'capture-targets.json');
if (!existsSync(targetsFile)) {
  console.error('capture-targets.json 이 없어요. 먼저 node scripts/make-capture-targets.mjs 를 실행하세요.');
  process.exit(1);
}
const { keys, targets } = JSON.parse(readFileSync(targetsFile, 'utf8'));
const only = process.argv[2]; // 이름 일부로 골라 찍기 (예: A09)
const selected = only ? targets.filter((t) => t.name.includes(only)) : targets;

mkdirSync(OUT_DIR, { recursive: true });
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${resolve(tmp, 'chrome-capture-profile')}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForChrome() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return await res.json();
    } catch { /* not ready */ }
    await sleep(200);
  }
  throw new Error('Chrome 디버그 포트가 열리지 않았어요.');
}

class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); ws.onmessage = (e) => this.onMessage(JSON.parse(e.data)); }
  static connect(url) { return new Promise((resolve, reject) => { const ws = new WebSocket(url); ws.onopen = () => resolve(new Cdp(ws)); ws.onerror = reject; }); }
  onMessage(msg) {
    if (msg.id && this.pending.has(msg.id)) { const { resolve, reject } = this.pending.get(msg.id); this.pending.delete(msg.id); msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result); }
  }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject })); }
  evaluate(expression) { return this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); }
  close() { this.ws.close(); }
}

const TAB_LABEL = { counsel: '상담실', records: '기록장', space: '내 공간' };

async function capture(target) {
  const created = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const cdp = await Cdp.connect(created.webSocketDebuggerUrl);
  try {
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 812, deviceScaleFactor: SCALE, mobile: true });

    // 1) 같은 출처에서 localStorage 상태를 심습니다.
    await cdp.send('Page.navigate', { url: `${BASE}/` });
    await sleep(700);
    const setup = [
      'localStorage.clear();',
      target.draft ? `localStorage.setItem(${JSON.stringify(keys.draft)}, ${JSON.stringify(JSON.stringify(target.draft))});` : '',
      target.records ? `localStorage.setItem(${JSON.stringify(keys.records)}, ${JSON.stringify(JSON.stringify(target.records))});` : '',
      target.theme ? `localStorage.setItem(${JSON.stringify(keys.theme)}, ${JSON.stringify(target.theme)});` : '',
      'true',
    ].join('\n');
    await cdp.evaluate(setup);

    // 2) 다시 열어 상태를 반영하고, 탭·기록 열기는 화면의 버튼을 눌러 도달합니다.
    await cdp.send('Page.navigate', { url: `${BASE}/` });
    await sleep(1200);
    if (target.tab) {
      await cdp.evaluate(`[...document.querySelectorAll('.nav-item')].find(b => b.textContent.includes(${JSON.stringify(TAB_LABEL[target.tab])}))?.click(); true`);
      await sleep(500);
    }
    if (typeof target.open === 'number') {
      await cdp.evaluate(`[...document.querySelectorAll('.record-item')][${target.open}]?.click(); true`);
      await sleep(500);
    }

    await cdp.evaluate('document.fonts ? document.fonts.ready.then(() => true) : true');
    await sleep(900);
    const { result } = await cdp.evaluate('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)');
    const height = Math.min(Math.max(812, Number(result.value) || 812), 9000);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height, deviceScaleFactor: SCALE, mobile: true });
    await sleep(500);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: WIDTH, height, scale: 1 } });
    const file = resolve(OUT_DIR, `${target.name}.png`);
    writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log(`[capture] ${target.name}  ${WIDTH}x${height}  ${target.theme ?? ''}`);
  } finally {
    cdp.close();
    await fetch(`http://127.0.0.1:${PORT}/json/close/${created.id}`).catch(() => {});
  }
}

try {
  await waitForChrome();
  for (const t of selected) await capture(t);
  console.log(`[capture] ${selected.length}장 → ${OUT_DIR}`);
} finally {
  chrome.kill();
}
