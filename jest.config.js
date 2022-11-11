// Visit https://jestjs.io/docs/configuration to read more about this file.

/** @type {import('jest').Config} */
const jestConfig = {
  preset: 'ts-jest/presets/js-with-ts',
  coverageProvider: 'v8',
  setupFilesAfterEnv: ['jest-extended/all', '<rootDir>/additional-configs/jestSetupAfterEnv.ts'],
};

module.exports = jestConfig;
