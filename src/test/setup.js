import '@testing-library/jest-dom/vitest';
import { webcrypto } from 'node:crypto';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom no siempre trae Web Crypto completo (SubtleCrypto, randomUUID): se usa el de Node
if (!globalThis.crypto?.subtle || !globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

// Cada prueba parte de un documento limpio y sin simulaciones pendientes
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
