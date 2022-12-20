import path from 'node:path';

export const rootPath = path.resolve(__dirname, '..');

export const encodingText = 'utf8';

export const depVerWebpack = process.env.E2E_DEP_VER_WEBPACK ?? '^5';
export const depVerWebpackCli = process.env.E2E_DEP_VER_WEBPACK_CLI ?? '^4';

export const webpackConfigDefaultFileName = 'webpack.config.js';
export const webpackProjectParentDirName = '__projects__';
export const webpackProjectMustHavePackageJson = {
  ['devDependencies']: {
    ['webpack']: depVerWebpack,
    ['webpack-cli']: depVerWebpackCli,
  },
};
export const webpackProjectMustHaveFiles = {
  'package.json': JSON.stringify(webpackProjectMustHavePackageJson),
};
