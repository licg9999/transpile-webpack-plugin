import os from 'node:os';

import { flatten, pick, set } from 'lodash';

import { pluginName } from './constants';
import { D } from './defaultsSetters';
import { HotModuleReplacementPlugin } from './peers/webpack';
import { CompilerOptions } from './types';

export function forceDisableSplitChunks(compilerOptions: CompilerOptions): void {
  set(compilerOptions, 'optimization.splitChunks', false);
}

export function forceSetLibraryType(compilerOptions: CompilerOptions, libraryType: string): void {
  set(compilerOptions, 'output.library.type', libraryType);
}

export function forceDisableOutputModule(compilerOptions: CompilerOptions): void {
  set(compilerOptions, 'experiments.outputModule', false);
}

export function throwErrIfOutputPathNotSpecified(compilerOptions: CompilerOptions): void {
  const { output } = compilerOptions;
  if (!output.path)
    throw new Error(`${pluginName}${os.EOL}The output.path in webpack config is not specified`);
}

export function throwErrIfHotModuleReplacementEnabled(compilerOptions: CompilerOptions): void {
  const { plugins } = compilerOptions;
  for (const p of plugins) {
    if (
      p instanceof HotModuleReplacementPlugin ||
      p.constructor.name === 'HotModuleReplacementPlugin'
    ) {
      throw new Error(
        `${pluginName}${os.EOL}Hot module replacement is not supported when using plugin '${pluginName}'`
      );
    }
  }
}

export function enableBuiltinNodeGlobalsByDefault(compilerOptions: CompilerOptions): void {
  if (compilerOptions.node) {
    D(compilerOptions.node, '__dirname', false);
    D(compilerOptions.node, '__filename', false);
  }
}

export function isTargetNodeCompatible(target: CompilerOptions['target']): boolean {
  return flatten([target]).some((t) => typeof t === 'string' && t.includes('node'));
}

export function alignResolveByDependency(compilerOptions: CompilerOptions, preferredType: string) {
  const { byDependency } = compilerOptions.resolve;
  if (!byDependency) return;
  if (!Object.prototype.hasOwnProperty.call(byDependency, preferredType)) preferredType = 'unknown';
  const preferredOpts = byDependency[preferredType];
  for (const [type, opts] of Object.entries(byDependency)) {
    if (type !== preferredType) {
      Object.assign(opts, pick(preferredOpts, Object.keys(opts)));
    }
  }
}
