import { hookStageVeryEarly, pluginName } from './constants';
import { Compiler, EvalSourceMapDevToolPlugin, SourceMapDevToolPlugin } from './peers/webpack';
import { CompilerOptions, SourceMapDevToolPluginOptions } from './types';

export class SourceMapDevToolPluginController {
  sourceMapDevToolPluginOptions?: SourceMapDevToolPluginOptions;
  oldDevtool: CompilerOptions['devtool'];

  apply(compiler: Compiler): void {
    compiler.hooks.environment.tap({ name: pluginName, stage: hookStageVeryEarly }, () => {
      if (compiler.options.devtool) {
        if (compiler.options.devtool.includes('source-map')) {
          this.initSourceMapDevToolPlugin(compiler);

          // Prevents devtool getting processed again inside webpack.
          this.disableDevtool(compiler.options);
        }
      }
    });

    compiler.hooks.initialize.tap({ name: pluginName, stage: hookStageVeryEarly }, () => {
      // Restore devtool after compiler options get processed inside webpack.
      this.restoreDevtool(compiler.options);
    });
  }

  initSourceMapDevToolPlugin(compiler: Compiler) {
    if (!compiler.options.devtool) return;

    // Aligns to:
    // https://github.com/webpack/webpack/blob/86a8bd9618c4677e94612ff7cbdf69affeba1268/lib/WebpackOptionsApply.js#L228-L247
    const hidden = compiler.options.devtool.includes('hidden');
    const inline = compiler.options.devtool.includes('inline');
    const evalWrapped = compiler.options.devtool.includes('eval');
    const cheap = compiler.options.devtool.includes('cheap');
    const moduleMaps = compiler.options.devtool.includes('module');
    const noSources = compiler.options.devtool.includes('nosources');
    const Plugin = evalWrapped ? EvalSourceMapDevToolPlugin : SourceMapDevToolPlugin;
    this.sourceMapDevToolPluginOptions = {
      filename: inline ? null : compiler.options.output.sourceMapFilename,
      moduleFilenameTemplate: compiler.options.output.devtoolModuleFilenameTemplate,
      fallbackModuleFilenameTemplate: compiler.options.output.devtoolFallbackModuleFilenameTemplate,
      append: hidden ? false : undefined,
      module: moduleMaps ? true : cheap ? false : true,
      columns: cheap ? false : true,
      noSources: noSources,
      namespace: compiler.options.output.devtoolNamespace,
    };
    new Plugin(this.sourceMapDevToolPluginOptions).apply(compiler);
  }

  disableDevtool(compilerOptions: CompilerOptions): void {
    this.oldDevtool = compilerOptions.devtool;
    compilerOptions.devtool = false;
  }

  restoreDevtool(compilerOptions: CompilerOptions): void {
    compilerOptions.devtool = this.oldDevtool;
  }

  setExtensionsToHaveSourceMaps(extensions: Iterable<string>): void {
    if (this.sourceMapDevToolPluginOptions) {
      // Aligns to:
      // https://github.com/webpack/webpack/blob/6fa6e30254f0eb2673a3525739da1df0a5f51791/lib/SourceMapDevToolPlugin.js#L155
      const reEndsWithExts = new RegExp(
        `(${Array.from(extensions)
          .map((e) => `\\${e}`)
          .join('|')})$`,
        'i'
      );

      this.sourceMapDevToolPluginOptions.test = reEndsWithExts;
    }
  }
}
