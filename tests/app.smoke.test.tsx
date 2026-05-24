import { describe, it, expect } from 'vitest';
import * as AppModule from '../src/App';

describe('App smoke', () => {
  it('exports the App component', () => {
    expect(AppModule).toBeTruthy();
    expect(AppModule.default || (AppModule as any).App).toBeTruthy();
  });
});
