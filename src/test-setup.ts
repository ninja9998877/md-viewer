/**
 * Minimal browser surface for the pure-logic tests.
 *
 * localStorage is the only global these modules reach for on import; anything
 * else (navigator, document) is stubbed per test so a test that forgets to set
 * it fails loudly instead of quietly reading another test's leftover.
 */
class MemoryStorage implements Storage {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
}

globalThis.localStorage = new MemoryStorage();
