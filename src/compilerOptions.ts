import { pick, set } from 'lodash';
import { pluginName } from './constants';
import { CompilerOptions } from './types';

export function throwErrIfOutputPathNotSpecified(compilerOptions: CompilerOptions): void {
  const { output } = compilerOptions;
  if (!output.path) throw new Error(`The output.path is not specified in webpack config`);
}

export function throwErrIfTargetNotSupported(compilerOptions: CompilerOptions): void {
  const { target } = compilerOptions;

  const errMsg =
    `The target '${target}' in webpack config is not supported ` +
    `when using plugin '${pluginName}' (please use a node-compatible target)`;

  if (!target) throw new Error(errMsg);

  const targets = Array.isArray(target) ? target : [target];

  if (targets.some((t) => ['web', 'webworker'].includes(t))) throw new Error(errMsg);
}

export function forceDisableSplitChunks(compilerOptions: CompilerOptions): void {
  set(compilerOptions, 'optimization.splitChunks', false);
}

export function forceSetLibraryType(compilerOptions: CompilerOptions, libraryType: string): void {
  set(compilerOptions, 'output.library.type', libraryType);
}

export function unifyDependencyResolving(compilerOptions: CompilerOptions, wantedType: string) {
  const { byDependency } = compilerOptions.resolve;
  if (!byDependency) return;
  if (!byDependency.hasOwnProperty(wantedType)) wantedType = 'unknown';
  const wantedOpts = byDependency[wantedType];
  for (const [type, opts] of Object.entries(byDependency)) {
    if (type !== wantedType) {
      Object.assign(opts, pick(wantedOpts, Object.keys(opts)));
    }
  }
}
