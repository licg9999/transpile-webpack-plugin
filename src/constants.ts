import { startCase } from 'lodash';

import { readJsonSync } from './readJson';

export const { name: packageName } = readJsonSync<{ name: string }>(
  require.resolve('../package.json')
);

export const pluginName = startCase(packageName);

export const reNodeModules = /[\\/]node_modules[\\/]/;
export const reMjsFile = /\.mjs$/;

export const baseNodeModules = 'node_modules';

export const resolveByDependencyTypeCjs = 'commonjs';
export const outputLibraryTypeCjs = 'commonjs-module';
export const externalModuleTypeCjs = 'commonjs-module';

export const extJson = '.json';

export const sourceTypeAsset = 'asset';

export const hookStageVeryEarly = -1000000;
