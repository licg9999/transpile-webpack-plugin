// Visit https://jestjs.io/docs/configuration to read more about this file.

const testPath = process.env.JEST_TEST_PATH;

/** @type {import('jest').Config} */
const jestConfig = {
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'].map((pattern) => {
    if (testPath) {
      pattern = `<rootDir>/${testPath}/${pattern}`;
    }
    return pattern;
  }),
  preset: 'ts-jest/presets/js-with-ts',
  coverageProvider: 'v8',
  setupFilesAfterEnv: ['jest-extended/all', '<rootDir>/additional-configs/jestSetupAfterEnv.ts'],
};

module.exports = jestConfig;
