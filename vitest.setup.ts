import '@testing-library/jest-dom';

const memoryStorage = (() => {
  let data: Record<string, string> = {};
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = String(value);
    },
    removeItem: (key: string) => {
      delete data[key];
    },
    clear: () => {
      data = {};
    },
  };
})();

if (
  typeof globalThis.localStorage === 'undefined' ||
  typeof globalThis.localStorage.getItem !== 'function' ||
  typeof globalThis.localStorage.setItem !== 'function' ||
  typeof globalThis.localStorage.removeItem !== 'function'
) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage,
    configurable: true,
  });
}
