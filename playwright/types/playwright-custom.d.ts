// Type definitions for custom Playwright test fixtures
import { TestType } from '@playwright/test';

declare module '@playwright/test' {
  interface PlaywrightTestArgs {
    logger: {
      info: (message: string) => void;
      warn: (message: string) => void;
      error: (message: string, error?: Error) => void;
      debug: (message: string) => void;
    };
    takeScreenshot: (name: string) => Promise<string>;
  }

  interface PlaywrightTestOptions {}
  interface PlaywrightWorkerArgs {}
  interface PlaywrightWorkerOptions {}
}

// This export is needed to make this a module
export {};
