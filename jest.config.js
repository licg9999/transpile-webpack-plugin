// Visit https://jestjs.io/docs/configuration to read more about this file.

const testPath = process.env.JEST_TEST_PATH;

/** @type {import('jest').Config} */
const jestConfig = {
  testRegex: ['__test__/.*\\.[jt]s$', '(.*\\.)?(test|spec)\\.[jt]s$'].map((s) => {
    if (testPath) {
      s = `${testPath}/(.*/)*${s}`;
    }
    return s;
  }),
  preset: 'ts-jest/presets/js-with-ts',
  coverageProvider: 'v8',
  setupFilesAfterEnv: ['jest-extended/all', '<rootDir>/additional-configs/jestSetupAfterEnv.ts'],
};

module.exports = jestConfig;
