import * as terser from 'terser';
import _TerserWebpackPlugin from 'terser-webpack-plugin';

declare class TerserWebpackPlugin<T = terser.MinifyOptions> extends _TerserWebpackPlugin<T> {
  options: _TerserWebpackPlugin.InternalPluginOptions<T>;
}

declare namespace TerserWebpackPlugin {
  export = _TerserWebpackPlugin;
}

export = TerserWebpackPlugin;
