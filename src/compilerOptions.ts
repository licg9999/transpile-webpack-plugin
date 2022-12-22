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

export function forceDisableOutputtingEsm(compilerOptions: CompilerOptions): void {
  set(compilerOptions, 'experiments.outputModule', false);
}

export function throwErrIfOutputPathNotSpecified(compilerOptions: CompilerOptions): void {
  const { output } = compilerOptions;
  if (!output.path) throw new Error(`The output.path in webpack config is not specified`);
}

export function throwErrIfHotModuleReplacementEnabled(compilerOptions: CompilerOptions): void {
  const { plugins } = compilerOptions;
  for (const p of plugins) {
    if (
      p instanceof HotModuleReplacementPlugin ||
      p.constructor.name === 'HotModuleReplacementPlugin'
    ) {
      throw new Error(`Hot module replacement is not supported when using plugin '${pluginName}'`);
    }
  }
}

export function enableBuiltinNodeGlobalsByDefaultIfTargetNodeCompatible(
  compilerOptions: CompilerOptions
): void {
  const { target } = compilerOptions;

  const isTargetNodeCompatible = flatten([target]).some(
    (t) => typeof t === 'string' && t.includes('node')
  );

  if (isTargetNodeCompatible) {
    if (compilerOptions.node) {
      D(compilerOptions.node, '__dirname', false);
      D(compilerOptions.node, '__filename', false);
    }
  }
}

export function unifyDependencyResolving(compilerOptions: CompilerOptions, wantedType: string) {
  const { byDependency } = compilerOptions.resolve;
  if (!byDependency) return;
  if (!Object.prototype.hasOwnProperty.call(byDependency, wantedType)) wantedType = 'unknown';
  const wantedOpts = byDependency[wantedType];
  for (const [type, opts] of Object.entries(byDependency)) {
    if (type !== wantedType) {
      Object.assign(opts, pick(wantedOpts, Object.keys(opts)));
    }
  }
}
