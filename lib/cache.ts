const store = new Map<string, { exp: number; v: unknown }>();
export const bust = (k: string) => { store.delete(k); };
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.exp > Date.now()) return hit.v as T;
  const v = await fn();
  store.set(key, { exp: Date.now() + ttlMs, v });
  return v;
}
export async function getJson<T>(url: string, init?: RequestInit, retries = 2): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { ...init, cache: "no-store" });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return (await r.json()) as T;
    } catch (e) { if (i >= retries) throw e; await new Promise((r) => setTimeout(r, 400 * (i + 1))); }
  }
}
