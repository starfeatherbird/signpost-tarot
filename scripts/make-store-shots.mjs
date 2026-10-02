/**
 * Play 스토어용 이미지 생성.
 *   node scripts/make-store-shots.mjs            휴대전화 6장(1080×1920) + 태블릿 7·10인치 3장씩(1620×2880) + 그래픽(1024×500) + 아이콘 512
 *   node scripts/make-store-shots.mjs phone-3    이름 일부로 골라서
 * 앞서 `npm run capture` 로 docs/screens/*.png 가 있어야 합니다(앱 화면 원본). 문구·사용 화면은 아래 FRAMES 에서 바꿉니다.
 * 결과: docs/store/phone-N-*.png, docs/store/feature-graphic.png, docs/store/icon-512.png
 * Chrome 헤드리스로 HTML 을 그려 찍습니다(capture-screens.mjs 와 같은 방식).
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');
const SCREENS = resolve(ROOT, 'docs', 'screens');
const OUT = resolve(ROOT, 'docs', 'store');
const tmp = process.env.TMP ?? '.';
const PORT = 9334;

/** 스크린샷 프레임: 어떤 화면을, 원본의 어느 높이(2배 px)부터 보여 줄지 */
const FRAMES = [
  { name: 'phone-1-hero', screen: 'A01-plan', offset: 0, headline: '고민이 막막할 때,\n카드가 방향을 보여 줘요', sub: '고민을 적고 세 장을 뽑으면 AI가 먼저 할 일을 정리해요' },
  { name: 'phone-2-deck', screen: 'A06-cards', offset: 400, headline: '섞인 덱에서\n세 장을 뽑아요', sub: '메이저·마이너 78장, 정방향과 역방향' },
  { name: 'phone-3-reveal', screen: 'A07-reveal', offset: 0, headline: '현재의 핵심, 놓친 관점,\n다음 움직임', sub: '세 자리에 놓인 카드를 상황과 함께 읽어요' },
  { name: 'phone-4-result', screen: 'A09-result', offset: 270, headline: '먼저 할 일부터\n작은 행동까지', sub: '단정 대신, 지금 상황에 맞는 제안과 체크리스트' },
  { name: 'phone-5-stone', screen: 'A09-result', offset: 3190, headline: '약속을 떠올리게 하는\n상징 스톤', sub: '며칠 뒤 돌아볼 질문으로 생각을 이어가요' },
  { name: 'phone-6-space', screen: 'A13-space', offset: 950, headline: '기록은 내 폰에,\n로그인하면 어디서나', sub: '모은 스톤과 기록장 · 계정 없이도 바로 시작' },
];

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe` : ''].find((p) => p && existsSync(p));
if (!CHROME) { console.error('Chrome 을 찾지 못했어요.'); process.exit(1); }

const dataUri = (file, mime = 'image/png') => `data:${mime};base64,${readFileSync(file).toString('base64')}`;

const FONT_HEAD = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">`;

function phoneHtml(frame, scale = 1) {
  const img = dataUri(resolve(SCREENS, `${frame.screen}.png`));
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">${FONT_HEAD}<style>
  html,body{margin:0;width:${1080 * scale}px;height:${1920 * scale}px;overflow:hidden}
  .stage{position:relative;width:1080px;height:1920px;transform:scale(${scale});transform-origin:0 0}
  body{font-family:Pretendard,system-ui,sans-serif;color:#F3EEE4;background:radial-gradient(120% 70% at 50% -10%,#1a2c4d 0%,#0F1A2E 55%,#0A1222 100%)}
  .stars{position:absolute;inset:0;opacity:.6;background-image:radial-gradient(1.5px 1.5px at 12% 18%,rgba(255,255,255,.6) 50%,transparent 51%),radial-gradient(2px 2px at 78% 9%,rgba(220,194,138,.7) 50%,transparent 51%),radial-gradient(1.5px 1.5px at 55% 33%,rgba(255,255,255,.45) 50%,transparent 51%),radial-gradient(1.5px 1.5px at 31% 61%,rgba(255,255,255,.4) 50%,transparent 51%),radial-gradient(2px 2px at 90% 47%,rgba(255,255,255,.5) 50%,transparent 51%),radial-gradient(1.5px 1.5px at 68% 78%,rgba(220,194,138,.55) 50%,transparent 51%);background-size:420px 420px,520px 520px,460px 460px,500px 500px,560px 560px,480px 480px}
  .text{position:absolute;left:72px;right:72px;top:120px;text-align:center}
  h1{font-family:'Gowun Batang',serif;font-weight:700;font-size:78px;line-height:1.25;margin:0;white-space:pre-line;letter-spacing:-0.01em}
  p{font-size:34px;line-height:1.5;margin:26px 0 0;color:#C9D3E3}
  .phone{position:absolute;left:50%;top:520px;transform:translateX(-50%);width:820px;height:1520px;border-radius:64px;background:#0F1A2E;box-shadow:0 0 0 12px #1c2f4f,0 0 0 14px rgba(201,168,106,.5),0 40px 90px rgba(0,0,0,.6);overflow:hidden}
  .phone img{position:absolute;left:0;top:${-frame.offset * (820 / 750)}px;width:820px;display:block}
  </style></head><body><div class="stage"><div class="stars"></div>
  <div class="text"><h1>${frame.headline}</h1><p>${frame.sub}</p></div>
  <div class="phone"><img src="${img}"></div>
  </div></body></html>`;
}

function featureHtml() {
  const back = dataUri(resolve(ROOT, 'public', 'cards', 'back.webp'), 'image/webp');
  const icon = dataUri(resolve(ROOT, 'store-assets', 'icons', 'app-icon-1024.png'));
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">${FONT_HEAD}<style>
  html,body{margin:0;width:1024px;height:500px;overflow:hidden}
  body{font-family:Pretendard,system-ui,sans-serif;color:#F3EEE4;background:radial-gradient(90% 120% at 20% 0%,#1a2c4d 0%,#0F1A2E 55%,#0A1222 100%);position:relative}
  .stars{position:absolute;inset:0;opacity:.55;background-image:radial-gradient(1.5px 1.5px at 12% 18%,rgba(255,255,255,.6) 50%,transparent 51%),radial-gradient(2px 2px at 78% 9%,rgba(220,194,138,.7) 50%,transparent 51%),radial-gradient(1.5px 1.5px at 55% 73%,rgba(255,255,255,.45) 50%,transparent 51%),radial-gradient(1.5px 1.5px at 31% 61%,rgba(255,255,255,.4) 50%,transparent 51%);background-size:300px 300px,360px 360px,320px 320px,340px 340px}
  .icon{position:absolute;left:72px;top:150px;width:200px;height:200px;border-radius:44px;box-shadow:0 20px 50px rgba(0,0,0,.5)}
  .text{position:absolute;left:310px;top:138px}
  h1{font-family:'Gowun Batang',serif;font-weight:700;font-size:72px;line-height:1.1;margin:0}
  p{font-size:28px;line-height:1.45;margin:16px 0 0;color:#C9D3E3;max-width:420px}
  .cards{position:absolute;right:40px;top:40px;width:300px;height:460px}
  .cards img{position:absolute;left:90px;top:60px;width:150px;border-radius:9px;outline:1.5px solid rgba(201,168,106,.5);box-shadow:0 24px 60px rgba(0,0,0,.6)}
  .cards img:nth-child(1){transform:rotate(-18deg) translate(-70px,30px)}
  .cards img:nth-child(2){transform:translateY(-10px);z-index:1}
  .cards img:nth-child(3){transform:rotate(18deg) translate(70px,30px)}
  </style></head><body><div class="stars"></div>
  <img class="icon" src="${icon}">
  <div class="text"><h1>이정표</h1><p>고민을 적고 카드 세 장을 뽑으면,<br>AI가 먼저 할 일을 정리해 줘요</p></div>
  <div class="cards"><img src="${back}"><img src="${back}"><img src="${back}"></div>
  </body></html>`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && this.pending.has(m.id)) { const { resolve, reject } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } }; }
  static connect(url) { return new Promise((res, rej) => { const ws = new WebSocket(url); ws.onopen = () => res(new Cdp(ws)); ws.onerror = rej; }); }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((res, rej) => this.pending.set(id, { resolve: res, reject: rej })); }
  evaluate(expression) { return this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); }
}

async function shoot(html, width, height, outFile) {
  const htmlFile = resolve(tmp, `store-shot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.html`);
  writeFileSync(htmlFile, html, 'utf8');
  const created = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const cdp = await Cdp.connect(created.webSocketDebuggerUrl);
  try {
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Page.navigate', { url: pathToFileURL(htmlFile).href });
    await sleep(1500);
    await cdp.evaluate('document.fonts ? document.fonts.ready.then(() => true) : true');
    await sleep(800);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 } });
    writeFileSync(outFile, Buffer.from(shot.data, 'base64'));
    console.log(`[store] ${outFile.replace(ROOT, '').replace(/\\/g, '/')}  ${width}x${height}`);
  } finally {
    cdp.ws.close();
    await fetch(`http://127.0.0.1:${PORT}/json/close/${created.id}`).catch(() => {});
  }
}

const only = process.argv[2];
mkdirSync(OUT, { recursive: true });
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars', '--allow-file-access-from-files', `--remote-debugging-port=${PORT}`, `--user-data-dir=${resolve(tmp, 'chrome-store-profile')}`, 'about:blank'], { stdio: 'ignore' });
try {
  for (let i = 0; i < 50; i += 1) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch { /* wait */ } await sleep(200); }
  for (const f of FRAMES) {
    if (only && !f.name.includes(only)) continue;
    if (!existsSync(resolve(SCREENS, `${f.screen}.png`))) { console.warn(`[store] 원본 없음: ${f.screen}.png (npm run capture 먼저)`); continue; }
    await shoot(phoneHtml(f), 1080, 1920, resolve(OUT, `${f.name}.png`));
  }
  // 태블릿 7인치·10인치: 같은 구성을 1.5배(1620×2880, 9:16)로. Play 는 두 종류 모두 이 크기를 받습니다.
  const TABLET = ['phone-1-hero', 'phone-3-reveal', 'phone-4-result'];
  for (const kind of ['tablet7', 'tablet10']) {
    if (only && !kind.includes(only)) continue;
    for (let i = 0; i < TABLET.length; i += 1) {
      const f = FRAMES.find((x) => x.name === TABLET[i]);
      if (!f || !existsSync(resolve(SCREENS, `${f.screen}.png`))) continue;
      await shoot(phoneHtml(f, 1.5), 1620, 2880, resolve(OUT, `${kind}-${i + 1}-${f.name.split('-')[2]}.png`));
    }
  }
  if (!only || 'feature'.includes(only)) await shoot(featureHtml(), 1024, 500, resolve(OUT, 'feature-graphic.png'));
  if (!only || 'icon'.includes(only)) {
    const sharp = (await import('sharp')).default;
    await sharp(resolve(ROOT, 'store-assets', 'icons', 'app-icon-1024.png')).resize(512, 512).png().toFile(resolve(OUT, 'icon-512.png'));
    console.log('[store] docs/store/icon-512.png  512x512');
  }
} finally {
  chrome.kill();
}
