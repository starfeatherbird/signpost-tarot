/**
 * 심층 상담 구매 확인 (RevenueCat).
 * - 앱은 RevenueCat 에 Supabase 사용자 id 를 app_user_id 로 등록하므로, 서버는 같은 id 로 구매 내역을 조회합니다.
 * - 심층 1회(deep_reading_1)는 소모성 상품입니다. "어느 거래를 어느 상담에 썼는지"를 tarot_deep_uses 표에 남겨
 *   같은 상담의 재정리·추가 질문은 다시 차감하지 않고, 다른 상담에는 새 거래가 있어야 합니다.
 * - REVENUECAT_SECRET_KEY 시크릿이 없으면 확인을 하지 않습니다(오픈 기간: 심층 무료).
 */
export const DEEP_PRODUCT_ID = 'deep_reading_1';
export const AD_FREE_ENTITLEMENT = 'ad_free';

export interface SubscriberSnapshot {
  /** 심층 상품 거래 id 목록 (구매 순) */
  deepTransactionIds: string[];
  adFree: boolean;
}

/** RevenueCat REST 로 구독자 정보를 읽습니다. 사용자가 없으면(구매 이력 없음) 빈 결과. */
export async function fetchSubscriber(secretKey: string, appUserId: string, fetchFn: typeof fetch = fetch): Promise<SubscriberSnapshot> {
  const res = await fetchFn(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`RevenueCat ${res.status}`);
  const body = (await res.json()) as {
    subscriber?: {
      non_subscriptions?: Record<string, { id: string; purchase_date: string }[]>;
      entitlements?: Record<string, { expires_date: string | null }>;
    };
  };
  return parseSubscriber(body);
}

export function parseSubscriber(body: { subscriber?: { non_subscriptions?: Record<string, { id: string; purchase_date: string }[]>; entitlements?: Record<string, { expires_date: string | null }> } }): SubscriberSnapshot {
  const list = body.subscriber?.non_subscriptions?.[DEEP_PRODUCT_ID] ?? [];
  const deepTransactionIds = [...list].sort((a, b) => a.purchase_date.localeCompare(b.purchase_date)).map((t) => t.id);
  const ent = body.subscriber?.entitlements?.[AD_FREE_ENTITLEMENT];
  const adFree = !!ent && (ent.expires_date === null || new Date(ent.expires_date).getTime() > Date.now());
  return { deepTransactionIds, adFree };
}

/** 아직 어떤 상담에도 쓰지 않은 거래 id (구매 순) */
export function unusedTransactions(all: string[], used: Iterable<string>): string[] {
  const usedSet = new Set(used);
  return all.filter((id) => !usedSet.has(id));
}

/** 표에 넣고 꺼내는 최소 인터페이스 (테스트에서는 가짜를 넣습니다) */
export interface DeepUsesStore {
  /** 이 사용자가 쓴 거래 id 전부와, 이 상담에 이미 쓴 거래가 있는지 */
  load(userId: string, consultationId: string): Promise<{ usedTransactionIds: string[]; thisConsultationUsed: boolean }>;
  /** 거래를 상담에 묶습니다 */
  record(userId: string, consultationId: string, transactionId: string): Promise<void>;
}

export type DeepAccess = { allowed: true; consumed?: string } | { allowed: false; reason: 'login_required' | 'no_credit' | 'no_consultation' };

/**
 * 심층 요청을 허용할지 정합니다.
 * followUp 은 이미 이 상담에 거래가 묶여 있어야 하고, deep 은 묶여 있지 않으면 새 거래 하나를 묶습니다.
 */
export async function checkDeepAccess(
  kind: 'deep' | 'followUp',
  userId: string | null,
  consultationId: string | undefined,
  snapshot: () => Promise<SubscriberSnapshot>,
  store: DeepUsesStore,
): Promise<DeepAccess> {
  if (!userId) return { allowed: false, reason: 'login_required' };
  if (!consultationId) return { allowed: false, reason: 'no_consultation' };
  const { usedTransactionIds, thisConsultationUsed } = await store.load(userId, consultationId);
  if (thisConsultationUsed) return { allowed: true };
  if (kind === 'followUp') return { allowed: false, reason: 'no_credit' };
  const snap = await snapshot();
  const [next] = unusedTransactions(snap.deepTransactionIds, usedTransactionIds);
  if (!next) return { allowed: false, reason: 'no_credit' };
  await store.record(userId, consultationId, next);
  return { allowed: true, consumed: next };
}

export const DEEP_ACCESS_MESSAGES: Record<Exclude<DeepAccess, { allowed: true }>['reason'], string> = {
  login_required: '심층 상담은 로그인한 뒤 구매할 수 있어요.',
  no_credit: '이 상담에 쓸 심층 상담 구매가 없어요. 심층 상담 1회를 구매한 뒤 다시 시도해 주세요.',
  no_consultation: '상담 정보가 없어 심층 결과를 만들 수 없어요. 앱을 최신 버전으로 업데이트해 주세요.',
};
