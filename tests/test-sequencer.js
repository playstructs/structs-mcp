/**
 * Custom test sequencer implementation
 * Workaround for ESM/CommonJS module resolution issues with @jest/test-sequencer
 * 
 * This is a minimal implementation that provides basic test sequencing functionality
 */

export default class CustomTestSequencer {
  constructor() {
    this._cache = new Map();
  }

  _getCachePath(testContext) {
    return testContext.config.cacheDirectory || '.jest-cache';
  }

  _getCache(test) {
    const cachePath = this._getCachePath(test.context);
    if (!this._cache.has(cachePath)) {
      this._cache.set(cachePath, {});
    }
    return this._cache.get(cachePath);
  }

  shard(tests, options) {
    if (!options || !options.shardIndex || !options.shardCount) {
      return tests;
    }
    const shardSize = Math.ceil(tests.length / options.shardCount);
    const shardStart = shardSize * (options.shardIndex - 1);
    const shardEnd = shardSize * options.shardIndex;
    return [...tests]
      .sort((a, b) => (a.path > b.path ? 1 : -1))
      .slice(shardStart, shardEnd);
  }

  sort(tests) {
    const copyTests = Array.from(tests);
    // Simple alphabetical sort by test file path
    return copyTests.sort((a, b) => {
      if (a.path < b.path) return -1;
      if (a.path > b.path) return 1;
      return 0;
    });
  }

  allFailedTests(tests) {
    return tests.filter(test => test.context && test.context.results && test.context.results.numFailingTests > 0);
  }

  cacheResults(tests, results) {
    // Basic caching implementation - can be enhanced later
    // For now, just a no-op to satisfy the interface
  }
}
