/**
 * app/stone_asset/ 의 스톤 그림 PNG 를 웹용으로 다듬어 public/stones/ 에 넣습니다.
 * - 파일명은 스톤 id 와 같아야 합니다 (예: moonstone.png, rose-quartz.png). 대소문자·공백은 정리합니다.
 * - 단색 배경(검정 등)에서 뽑은 그림이면 배경을 지웁니다. 네 모서리 색을 배경색으로 보고, 가장자리에서 이어진
 *   배경 픽셀만 지우므로 돌 안쪽의 어두운 부분(흑요석 등)은 남습니다.
 * - 배경을 지운 뒤 외곽 1~3px 띠는 배경색이 섞여 있어(밝은 테마에서 검은 테두리로 보임) 섞인 만큼 걷어 냅니다(디프린지):
 *   관측색 = a·돌색 + (1-a)·배경색 → 돌색 = (관측색 - (1-a)·배경색) / a
 * - 이미 투명 배경이면 배경 처리 없이 여백만 정리합니다.
 * - 돌 주변 여백을 잘라 정사각형 MAX_SIZE 이하 WebP(투명)로 저장. 원본보다 결과가 최신이면 건너뜁니다.
 * `npm run dev` / `npm run build` 전에 자동 실행됩니다. 원본 폴더는 git 에 넣지 않습니다.
 */
import { existsSync, mkdirSync, readdirSync, statSync, utimesSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_SIZE = 320;   // 화면 최대 표시 48px·모음 36px 이라 2~3배면 충분
const QUALITY = 88;
const BG_NEAR = 24;     // 배경색과 이 거리(RGB 유클리드) 안이면 배경으로 봄
const BG_FAR = 110;     // 이 거리 이상이면 완전 불투명한 돌로 봄 (그 사이는 반투명 띠)
const BAND = 3;         // 배경과 맞닿은 이 픽셀 폭까지 디프린지
const PAD_RATIO = 0.08; // 잘라낸 돌 주변 여백 비율

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = resolve(here, '..', 'stone_asset');
const TARGET_DIR = resolve(here, '..', 'public', 'stones');

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('[stones] sharp 를 불러오지 못했어요. npm install 을 다시 실행해 주세요.');
  process.exit(1);
}

const baseName = (name) => name.replace(/\.png$/i, '').trim().toLowerCase().replace(/[\s_]+/g, '-');
const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** 원본을 읽어 배경 제거·디프린지·여백 정리를 한 RGBA 버퍼와 크기를 돌려줍니다. */
export async function cleanStone(sharpLib, src) {
  const { data, info } = await sharpLib(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const n = w * h;

  // 네 모서리 6×6 평균으로 배경색·배경 알파 추정
  const corner = (x0, y0) => {
    let r = 0, g = 0, b = 0, a = 0, c = 0;
    for (let y = y0; y < y0 + 6; y++) for (let x = x0; x < x0 + 6; x++) {
      const i = (y * w + x) * 4;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; a += data[i + 3]; c++;
    }
    return [r / c, g / c, b / c, a / c];
  };
  const cs = [corner(0, 0), corner(w - 6, 0), corner(0, h - 6), corner(w - 6, h - 6)];
  const bg = [0, 1, 2, 3].map((k) => cs.reduce((s, v) => s + v[k], 0) / 4);
  const alreadyTransparent = bg[3] < 8;

  const isBg = new Uint8Array(n);
  let mode = 'transparent';
  if (alreadyTransparent) {
    for (let p = 0; p < n; p++) if (data[p * 4 + 3] < 8) isBg[p] = 1;
  } else {
    mode = 'solid';
    const dist = (p) => {
      const i = p * 4;
      const dr = data[i] - bg[0], dg = data[i + 1] - bg[1], db = data[i + 2] - bg[2];
      return Math.sqrt(dr * dr + dg * dg + db * db);
    };
    // 가장자리에서 이어진 배경색 픽셀만 지움 (돌 안쪽의 같은 색은 남김)
    const stack = [];
    const visit = (x, y) => {
      const p = y * w + x;
      if (isBg[p]) return;
      if (dist(p) < BG_NEAR) { isBg[p] = 1; stack.push(p); }
    };
    for (let x = 0; x < w; x++) { visit(x, 0); visit(x, h - 1); }
    for (let y = 0; y < h; y++) { visit(0, y); visit(w - 1, y); }
    while (stack.length) {
      const p = stack.pop();
      const x = p % w, y = (p - x) / w;
      if (x > 0) visit(x - 1, y);
      if (x < w - 1) visit(x + 1, y);
      if (y > 0) visit(x, y - 1);
      if (y < h - 1) visit(x, y + 1);
    }
    // 배경과 맞닿은 띠(BAND px) 찾기
    const inBand = new Uint8Array(n);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (isBg[p]) continue;
      let nearBg = false;
      for (let dy = -BAND; dy <= BAND && !nearBg; dy++) for (let dx = -BAND; dx <= BAND; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h || isBg[yy * w + xx]) { nearBg = true; break; }
      }
      if (nearBg) inBand[p] = 1;
    }
    // 디프린지: 띠 픽셀마다 근처의 "안쪽 돌 색" C 를 구하고, 관측색 = a·C + (1-a)·배경색 에서 a 를 역산해
    // 색은 C 로, 알파는 a 로 둡니다. (배경색이 섞여 어두워진 테두리를 걷어 냄)
    const R = BAND + 4;
    const src4 = Buffer.from(data); // 원본 관측값 (수정 전) 기준으로 계산
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!inBand[p]) continue;
      let cr = 0, cg = 0, cb = 0, c = 0;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const q = yy * w + xx;
        if (isBg[q] || inBand[q]) continue;
        cr += src4[q * 4]; cg += src4[q * 4 + 1]; cb += src4[q * 4 + 2]; c++;
      }
      const i = p * 4;
      let a;
      if (c > 0) {
        cr /= c; cg /= c; cb /= c;
        const vr = cr - bg[0], vg = cg - bg[1], vb = cb - bg[2];
        const len2 = vr * vr + vg * vg + vb * vb;
        a = len2 < 1 ? 1 : ((src4[i] - bg[0]) * vr + (src4[i + 1] - bg[1]) * vg + (src4[i + 2] - bg[2]) * vb) / len2;
        a = Math.min(1, Math.max(0, a));
        if (a >= 0.02) { data[i] = Math.round(cr); data[i + 1] = Math.round(cg); data[i + 2] = Math.round(cb); }
      } else {
        // 근처에 안쪽 돌 색이 없으면(아주 얇은 부분) 거리로 대략 추정
        const d = dist(p);
        a = Math.min(1, Math.max(0.06, (d - BG_NEAR) / (BG_FAR - BG_NEAR)));
        for (let k = 0; k < 3; k++) data[i + k] = clamp255(Math.round((src4[i + k] - (1 - a) * bg[k]) / a));
      }
      data[i + 3] = Math.round(src4[i + 3] * a);
    }
  }
  for (let p = 0; p < n; p++) if (isBg[p]) { data[p * 4 + 3] = 0; }

  // 돌 주변 여백 정리: 알파가 있는 영역의 경계 상자 + 여백, 정사각형으로
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > 8) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  if (maxX < 0) throw new Error('돌을 찾지 못했어요 (전부 배경으로 판단됨).');
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const side = Math.round(Math.max(bw, bh) * (1 + PAD_RATIO * 2));
  const cx = Math.round((minX + maxX) / 2), cy = Math.round((minY + maxY) / 2);
  const left = cx - Math.floor(side / 2), top = cy - Math.floor(side / 2);

  // 정사각형 캔버스에 놓기 (원본 밖은 투명)
  const out = Buffer.alloc(side * side * 4, 0);
  for (let y = 0; y < side; y++) {
    const sy = top + y;
    if (sy < 0 || sy >= h) continue;
    for (let x = 0; x < side; x++) {
      const sx = left + x;
      if (sx < 0 || sx >= w) continue;
      data.copy(out, (y * side + x) * 4, (sy * w + sx) * 4, (sy * w + sx) * 4 + 4);
    }
  }
  return { buffer: out, size: side, mode, bbox: { w: bw, h: bh } };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (!existsSync(SOURCE_DIR)) {
    console.log(`[stones] 그림 폴더가 없어 보석 모양으로 대신합니다. (그림을 넣으려면: ${SOURCE_DIR})`);
    process.exit(0);
  }
  mkdirSync(TARGET_DIR, { recursive: true });
  let done = 0;
  let skipped = 0;
  for (const file of readdirSync(SOURCE_DIR)) {
    if (!/\.png$/i.test(file)) continue;
    const src = join(SOURCE_DIR, file);
    const dst = join(TARGET_DIR, `${baseName(file)}.webp`);
    if (existsSync(dst) && statSync(dst).mtimeMs >= statSync(src).mtimeMs) {
      skipped += 1;
      continue;
    }
    try {
      const { buffer, size, mode } = await cleanStone(sharp, src);
      await sharp(buffer, { raw: { width: size, height: size, channels: 4 } })
        .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: QUALITY, alphaQuality: 95 })
        .toFile(dst);
      const now = new Date();
      utimesSync(dst, now, now);
      done += 1;
      console.log(`[stones] ${file} → ${baseName(file)}.webp (${mode === 'solid' ? '배경 제거+디프린지' : '투명 배경 그대로'})`);
    } catch (err) {
      console.error(`[stones] ${file} 처리 실패: ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`[stones] 변환 ${done}개, 최신 ${skipped}개 → ${TARGET_DIR}`);
}
