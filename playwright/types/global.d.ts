import { TestType, Page } from '@playwright/test';

declare global {
  // Extend the global test context with our custom fixtures
  interface PlaywrightTestArgs {
    logger: {
      info: (message: string) => void;
      warn: (message: string) => void;
      error: (message: string, error?: Error) => void;
      debug: (message: string) => void;
    };
    takeScreenshot: (name: string) => Promise<string>;
  }

  // Add any global type declarations here
  const test: TestType<{}>;
}

export {}; // This file needs to be a module
