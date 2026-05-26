import '@testing-library/jest-dom';
import { afterEach } from 'vitest';

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

if (typeof window !== 'undefined') {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;

  const canvasContext2d = {
    arc: () => undefined,
    beginPath: () => undefined,
    clearRect: () => undefined,
    fill: () => undefined,
    fillRect: () => undefined,
    fillText: () => undefined,
    lineTo: () => undefined,
    moveTo: () => undefined,
    stroke: () => undefined,
    set fillStyle(_value: string) {},
    set font(_value: string) {},
    set lineWidth(_value: number) {},
    set strokeStyle(_value: string) {},
  };

  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: (contextId: string) => (contextId === '2d' ? canvasContext2d : null),
  });

  let nextAnimationFrameId = 1;
  const animationFrames = new Map<number, ReturnType<typeof setTimeout>>();

  window.requestAnimationFrame = (callback: FrameRequestCallback) => {
    const id = nextAnimationFrameId++;
    const timeout = setTimeout(() => {
      animationFrames.delete(id);
      callback(performance.now());
    }, 16);
    animationFrames.set(id, timeout);
    return id;
  };

  window.cancelAnimationFrame = (id: number) => {
    const timeout = animationFrames.get(id);
    if (timeout) {
      clearTimeout(timeout);
      animationFrames.delete(id);
    }
  };

  afterEach(() => {
    animationFrames.forEach(timeout => clearTimeout(timeout));
    animationFrames.clear();
  });
}
