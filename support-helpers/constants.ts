import path from 'node:path';

export const encodingText = 'utf8';

export const webpackConfigDefaultFileName = 'webpack.config.js';
export const webpackProjectParentDirName = '__projects__';
export const webpackProjectMustHaveFiles = {
  'package.json': JSON.stringify({
    ['devDependencies']: {
      ['webpack']: process.env.E2E_DEP_VER_WEBPACK ?? '^5.75.0',
      ['webpack-cli']: process.env.E2E_DEP_VER_WEBPACK_CLI ?? `^4.10.0`,
    },
  }),
};

export const rootPath = path.resolve(__dirname, '..');
export const rootPathAsLiteral = JSON.stringify(rootPath);
