import { flatten } from 'lodash';
import type { Compiler } from 'webpack';

import { A } from './defaultsSetters';
import TerserWebpackPlugin from './peers/terser-webpack-plugin';
import TerserWebpackPluginFromWebpack from './peers/terser-webpack-plugin-from-webpack';
import { CompilerOptions } from './types';

export class TerserWebpackPluginController {
  terserWebpackPlugin?: TerserWebpackPlugin;
  iniTest?: TerserWebpackPlugin.Rules;

  apply(compiler: Compiler): void {
    this.findOrInitTerserWebpackPlugin(compiler.options);
    this.iniTest = this.terserWebpackPlugin?.options.test;
  }

  findOrInitTerserWebpackPlugin(compilerOptions: CompilerOptions) {
    // Aligns to:
    // https://github.com/webpack/webpack/blob/4b4ca3bb53f36a5b8fc6bc1bd976ed7af161bd80/lib/config/defaults.js#L1160-L1174
    A(compilerOptions.optimization, 'minimizer', () => [
      new TerserWebpackPluginFromWebpack({
        terserOptions: {
          compress: {
            passes: 2,
          },
        },
      }),
    ]);

    this.terserWebpackPlugin = compilerOptions.optimization.minimizer?.find(
      (p) =>
        p instanceof TerserWebpackPlugin ||
        p instanceof TerserWebpackPluginFromWebpack ||
        p.constructor.name === 'TerserPlugin'
    ) as TerserWebpackPlugin | undefined;
  }

  setNamesToBeMinimized(names: Iterable<string>): void {
    if (!this.terserWebpackPlugin) return;

    const newTest: (string | RegExp)[] = this.iniTest ? flatten([this.iniTest]) : [];
    for (const name of names) {
      newTest.push(
        // Aligns to:
        // https://github.com/webpack/webpack/blob/4b4ca3bb53f36a5b8fc6bc1bd976ed7af161bd80/lib/ModuleFilenameHelpers.js#L73
        new RegExp(`^${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i')
      );
    }
    this.terserWebpackPlugin.options.test = newTest as TerserWebpackPlugin.Rules;
  }
}
