import { AdMob, BannerAdPluginEvents, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';
import { AD_TESTING, ADMOB_BANNER_ID } from '../config/ads';
import { isNativeApp } from './native';

/**
 * 하단 배너 광고. 네이티브 뷰라 웹뷰 위에 얹히므로,
 * - 배너 높이를 CSS 변수(--ad-h)와 html.has-ad 로 알려 탭 바를 그만큼 올리고 본문 여백을 둡니다.
 * - 입력칸에 포커스가 있는 동안은 숨깁니다(키보드 위로 따라 올라와 입력칸을 가림).
 * - 불러오기에 실패하면 1분 뒤 다시 시도합니다.
 * 웹에서는 아무것도 하지 않습니다.
 */
let initialized = false;
let bannerOn = false;
let hiddenForInput = false;
let wanted = false;
let retry: ReturnType<typeof setTimeout> | null = null;

const TYPING = 'input, textarea, [contenteditable="true"]';

function setAdHeight(h: number): void {
  const root = document.documentElement;
  root.style.setProperty('--ad-h', `${h > 0 ? h : 0}px`);
  root.classList.toggle('has-ad', h > 0);
}

async function init(): Promise<boolean> {
  if (initialized) return true;
  try {
    await AdMob.initialize({ initializeForTesting: AD_TESTING });
    AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => {
      const h = size?.height ?? 0;
      if (h > 0 && (hiddenForInput || !wanted)) return; // 숨겨 둔 사이 새로 고쳐져도 자리를 비워 두지 않음
      setAdHeight(h);
    });
    AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
      bannerOn = false;
      if (retry) clearTimeout(retry);
      retry = setTimeout(() => { if (wanted) void show(); }, 60_000);
    });
    document.addEventListener('focusin', (e) => {
      if (!bannerOn || hiddenForInput || !(e.target instanceof Element) || !e.target.matches(TYPING)) return;
      hiddenForInput = true;
      setAdHeight(0);
      AdMob.hideBanner().catch(() => {});
    });
    document.addEventListener('focusout', () => {
      if (!hiddenForInput) return;
      hiddenForInput = false;
      if (wanted && bannerOn) AdMob.resumeBanner().catch(() => {});
    });
    initialized = true;
    return true;
  } catch (err) {
    console.warn('[ads] init failed', err);
    return false;
  }
}

async function show(): Promise<void> {
  if (bannerOn) return;
  bannerOn = true;
  try {
    await AdMob.showBanner({
      adId: ADMOB_BANNER_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: AD_TESTING,
    });
  } catch (err) {
    bannerOn = false;
    console.warn('[ads] show failed', err);
  }
}

/** 배너를 보여 줄지 말지. 화면이 바뀔 때마다 호출합니다. */
export async function setBannerVisible(visible: boolean): Promise<void> {
  if (!isNativeApp) return;
  wanted = visible;
  if (visible) {
    if (!(await init())) return;
    if (hiddenForInput) return;
    await show();
  } else {
    if (retry) clearTimeout(retry);
    bannerOn = false;
    hiddenForInput = false;
    setAdHeight(0);
    await AdMob.removeBanner().catch(() => {});
  }
}
