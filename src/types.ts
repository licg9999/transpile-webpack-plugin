import type { SourceMapDevToolPlugin, WebpackOptionsNormalized } from 'webpack';

export type MaybeArray<T> = T | T[];

export type MaybePromise<T> = T | Promise<T>;

export type SourceMapDevToolPluginOptions = NonNullable<
  ConstructorParameters<typeof SourceMapDevToolPlugin>[0]
>;

export type CompilerOptions = WebpackOptionsNormalized;
