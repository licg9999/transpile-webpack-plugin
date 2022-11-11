import path from 'node:path';

export const encodingText = 'utf8';

export const webpackConfigDefaultFileName = 'webpack.config.js';
export const webpackProjectParentDirName = '__projects__';
export const webpackProjectMustHaveFiles = {
  'package.json': '{}',
};

export const rootPath = path.resolve(__dirname, '..');
export const rootPathAsLiteral = JSON.stringify(rootPath);
