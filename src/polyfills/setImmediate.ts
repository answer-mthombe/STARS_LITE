// Web bundlers don't always provide setImmediate; some libraries (including PouchDB deps) expect it.
if (typeof globalThis.setImmediate !== "function") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).setImmediate = (fn: (...args: any[]) => void, ...args: any[]) => setTimeout(fn, 0, ...args);
}

