import { Capacitor } from '@capacitor/core';

/** Capacitor 안드로이드 앱 안에서 돌고 있는지. 웹(GitHub Pages)에서는 false. */
export const isNativeApp = Capacitor.isNativePlatform();

/** 로그인 뒤 앱으로 돌아오는 주소 (AndroidManifest 의 intent-filter 와 같아야 함) */
export const NATIVE_AUTH_REDIRECT = 'com.solamemento.signpost://auth';
