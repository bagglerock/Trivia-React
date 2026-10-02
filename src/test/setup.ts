import { afterEach, vi } from 'vitest';

/**
 * Node 25 ships an experimental global `localStorage` that shadows the DOM one and has no methods
 * unless started with --localstorage-file. Give every test a fresh in-memory Storage instead.
 */
class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() {
    return this.items.size;
  }
  clear() {
    this.items.clear();
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  key(i: number) {
    return [...this.items.keys()][i] ?? null;
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  setItem(key: string, value: string) {
    this.items.set(key, String(value));
  }
}

const install = () => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
  if (typeof window !== 'undefined') Object.defineProperty(window, 'localStorage', { value: storage, configurable: true, writable: true });
};

install();
afterEach(() => {
  install();
  vi.restoreAllMocks();
});
