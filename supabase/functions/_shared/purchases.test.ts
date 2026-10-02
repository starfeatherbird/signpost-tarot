import { describe, expect, it } from 'vitest';
import { checkDeepAccess, parseSubscriber, unusedTransactions, type DeepUsesStore } from './purchases.ts';

function fakeStore(initial: { user: string; consultation: string; tx: string }[] = []): DeepUsesStore & { rows: typeof initial } {
  const rows = [...initial];
  return {
    rows,
    async load(userId, consultationId) {
      const mine = rows.filter((r) => r.user === userId);
      return { usedTransactionIds: mine.map((r) => r.tx), thisConsultationUsed: mine.some((r) => r.consultation === consultationId) };
    },
    async record(userId, consultationId, transactionId) {
      rows.push({ user: userId, consultation: consultationId, tx: transactionId });
    },
  };
}

const snapWith = (ids: string[]) => async () => ({ deepTransactionIds: ids, adFree: false });

describe('심층 구매 확인', () => {
  it('RevenueCat 응답에서 심층 거래를 구매 순으로, 광고 제거는 만료되지 않았을 때만 읽는다', () => {
    const snap = parseSubscriber({
      subscriber: {
        non_subscriptions: { deep_reading_1: [{ id: 'b', purchase_date: '2026-10-02T02:00:00Z' }, { id: 'a', purchase_date: '2026-10-01T02:00:00Z' }] },
        entitlements: { ad_free: { expires_date: null } },
      },
    });
    expect(snap.deepTransactionIds).toEqual(['a', 'b']);
    expect(snap.adFree).toBe(true);
    expect(parseSubscriber({ subscriber: { entitlements: { ad_free: { expires_date: '2000-01-01T00:00:00Z' } } } }).adFree).toBe(false);
    expect(parseSubscriber({}).deepTransactionIds).toEqual([]);
  });

  it('쓰지 않은 거래만 남긴다', () => {
    expect(unusedTransactions(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c']);
  });

  it('로그인·상담 id 가 없으면 막는다', async () => {
    const store = fakeStore();
    expect(await checkDeepAccess('deep', null, 'c1', snapWith(['a']), store)).toEqual({ allowed: false, reason: 'login_required' });
    expect(await checkDeepAccess('deep', 'u1', undefined, snapWith(['a']), store)).toEqual({ allowed: false, reason: 'no_consultation' });
  });

  it('새 상담은 거래 하나를 묶고, 같은 상담의 재정리·추가 질문은 다시 차감하지 않는다', async () => {
    const store = fakeStore();
    expect(await checkDeepAccess('deep', 'u1', 'c1', snapWith(['a', 'b']), store)).toEqual({ allowed: true, consumed: 'a' });
    expect(await checkDeepAccess('deep', 'u1', 'c1', snapWith(['a', 'b']), store)).toEqual({ allowed: true });
    expect(await checkDeepAccess('followUp', 'u1', 'c1', snapWith(['a', 'b']), store)).toEqual({ allowed: true });
    expect(await checkDeepAccess('deep', 'u1', 'c2', snapWith(['a', 'b']), store)).toEqual({ allowed: true, consumed: 'b' });
    expect(await checkDeepAccess('deep', 'u1', 'c3', snapWith(['a', 'b']), store)).toEqual({ allowed: false, reason: 'no_credit' });
    expect(await checkDeepAccess('followUp', 'u1', 'c3', snapWith(['a', 'b']), store)).toEqual({ allowed: false, reason: 'no_credit' });
    expect(store.rows).toHaveLength(2);
  });

  it('다른 사용자의 거래는 섞이지 않는다', async () => {
    const store = fakeStore([{ user: 'u2', consultation: 'x', tx: 'a' }]);
    expect(await checkDeepAccess('deep', 'u1', 'c1', snapWith(['a']), store)).toEqual({ allowed: true, consumed: 'a' });
  });
});
