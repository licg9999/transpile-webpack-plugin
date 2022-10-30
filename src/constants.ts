import { startCase } from 'lodash';
import { readJsonSync } from './readJson';

export const { name: packageName } = readJsonSync<{ name: string }>(
  require.resolve('../package.json')
);

export const pluginName = startCase(packageName);

export const reNodeModules = /[\\/]node_modules[\\/]/;
export const baseNodeModules = 'node_modules';

export const moduleType = 'commonjs-module';

export const extJson = '.json';

export const sourceTypeAsset = 'asset';

export const stageVeryEarly = -1000000;
