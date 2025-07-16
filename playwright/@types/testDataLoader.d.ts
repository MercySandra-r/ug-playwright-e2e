/**
 * Type definitions for testDataLoader module
 */

declare module '../utils/testDataLoader' {
  import { TestDataLoader } from '../utils/testDataLoader';
  
  const testDataLoader: TestDataLoader;
  export = testDataLoader;
}

declare module 'testDataLoader' {
  import { TestDataLoader } from '../utils/testDataLoader';
  
  const testDataLoader: TestDataLoader;
  export = testDataLoader;
}
