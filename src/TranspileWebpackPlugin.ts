import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { clone } from 'lodash';
import { validate } from 'schema-utils';

import { commonDirSync } from './commonDir';
import {
  alignResolveByDependency,
  enableBuiltinNodeGlobalsByDefault,
  forceDisableOutputModule,
  forceDisableSplitChunks,
  forceSetLibraryType,
  isTargetNodeCompatible,
  throwErrIfHotModuleReplacementEnabled,
  throwErrIfOutputPathNotSpecified,
} from './compilerOptions';
import { Condition, createConditionTest } from './conditionTest';
import {
  baseNodeModules,
  externalModuleTypeCjs,
  extJson,
  hookStageVeryEarly,
  outputLibraryTypeCjs,
  pluginName,
  reMjsFile,
  reNodeModules,
  resolveByDependencyTypeCjs,
  sourceTypeAsset,
} from './constants';
import optionsSchema from './optionsSchema.json';
import {
  Compiler,
  Dependency,
  ExternalModule,
  Module,
  NormalModule,
  sources,
  WebpackError,
} from './peers/webpack';
import ModuleProfile from './peers/webpack/lib/ModuleProfile';
import { SourceMapDevToolPluginController } from './SourceMapDevToolPluginController';
import { TerserWebpackPluginController } from './TerserWebpackPluginController';
import { TranspileExternalModule } from './TranspileExternalModule';
import { walkDependencies, walkDependenciesSync } from './walkDependencies';

const { RawSource } = sources;

export type TranspileWebpackPluginOptions = Partial<TranspileWebpackPluginInternalOptions>;

export interface TranspileWebpackPluginInternalOptions {
  exclude: Condition;
  hoistNodeModules: boolean;
  longestCommonDir?: string;
  extentionMapping: Record<string, string>;
  preferResolveByDependencyAsCjs: boolean;
}

export class TranspileWebpackPlugin {
  options: TranspileWebpackPluginInternalOptions;
  sourceMapDevToolPluginController: SourceMapDevToolPluginController;
  terserWebpackPluginController: TerserWebpackPluginController;

  constructor(options: TranspileWebpackPluginOptions = {}) {
    validate(optionsSchema as object, options, {
      name: pluginName,
      baseDataPath: 'options',
    });

    this.options = {
      ...options,
      exclude: options.exclude ?? [],
      hoistNodeModules: options.hoistNodeModules ?? true,
      extentionMapping: options.extentionMapping ?? {},
      preferResolveByDependencyAsCjs: options.preferResolveByDependencyAsCjs ?? true,
    };
    this.sourceMapDevToolPluginController = new SourceMapDevToolPluginController();
    this.terserWebpackPluginController = new TerserWebpackPluginController();
  }

  apply(compiler: Compiler) {
    const {
      exclude,
      hoistNodeModules,
      longestCommonDir,
      extentionMapping,
      preferResolveByDependencyAsCjs,
    } = this.options;

    forceDisableSplitChunks(compiler.options);
    forceSetLibraryType(compiler.options, outputLibraryTypeCjs);
    forceDisableOutputModule(compiler.options);

    const isPathExcluded = createConditionTest(exclude);
    const isPathInNodeModules = createConditionTest(reNodeModules);
    const isPathMjsFile = createConditionTest(reMjsFile);

    this.sourceMapDevToolPluginController.apply(compiler);
    this.terserWebpackPluginController.apply(compiler);

    compiler.hooks.environment.tap({ name: pluginName, stage: hookStageVeryEarly }, () => {
      throwErrIfOutputPathNotSpecified(compiler.options);
      throwErrIfHotModuleReplacementEnabled(compiler.options);

      if (isTargetNodeCompatible(compiler.options.target)) {
        enableBuiltinNodeGlobalsByDefault(compiler.options);
      }

      if (preferResolveByDependencyAsCjs) {
        alignResolveByDependency(compiler.options, resolveByDependencyTypeCjs);
      }
    });

    compiler.hooks.finishMake.tapPromise(pluginName, async (compilation) => {
      // Only evaluates new entries in the main compilation.
      if (compilation.compiler !== compiler) return;

      const outputPath = compiler.options.output.path!;
      const outputPathOfNodeModules = path.resolve(outputPath, baseNodeModules);
      const context = compiler.options.context!;

      const entryDeps = new Map<string, Dependency>();
      const touchedMods = new Set<Module>();
      for (const e of compilation.entries.values()) {
        for (const d of e.dependencies) {
          collectEntryDepsRecursively(d);
        }
      }
      touchedMods.clear();

      const entryResourcePaths = Array.from(entryDeps.keys());
      const entryResourcePathsWoNodeModules = entryResourcePaths.filter(
        (p) => !isPathInNodeModules(p)
      );

      if (entryResourcePathsWoNodeModules.length === 0) {
        throw new Error(`${pluginName}${os.EOL}No entry is found outside 'node_modules'`);
      }

      if (isTargetNodeCompatible(compiler.options.target)) {
        const entryResourceMjsFiles = entryResourcePaths.filter(isPathMjsFile);
        if (entryResourceMjsFiles.length > 0) {
          const warning = new WebpackError(
            `${pluginName}${os.EOL}Might be problematic to run '.mjs' files with target 'node'. Found '.mjs' files:${os.EOL}` +
              entryResourceMjsFiles
                .map((p) => `  .${path.sep}${path.relative(context, p)}`)
                .join(os.EOL)
          );
          compilation.warnings.push(warning);
        }
      }

      const commonDir = commonDirSync(entryResourcePaths, {
        context,
        longestCommonDir,
      });
      const commonDirWoNodeModules = commonDirSync(entryResourcePathsWoNodeModules, {
        context,
        longestCommonDir,
      });
      for (const entryDep of entryDeps.values()) {
        await makeExtDepsRecursively(entryDep);
      }
      touchedMods.clear();

      const entries = new Map() as typeof compilation.entries;
      const entryExtentionsToHaveSourceMaps = new Set<string>();
      makeEntriesAndCollectEntryExtentions();
      entryDeps.clear();
      this.sourceMapDevToolPluginController.setExtensionsToHaveSourceMaps(
        entryExtentionsToHaveSourceMaps
      );
      entryExtentionsToHaveSourceMaps.clear();
      this.terserWebpackPluginController.setNamesToBeMinimized(entries.keys());
      compilation.entries.clear();
      compilation.entries = entries;

      /* **** */

      function collectEntryDepsRecursively(entryDep: Dependency): void {
        const entryMod = compilation.moduleGraph.getModule(entryDep);
        if (!entryMod || touchedMods.has(entryMod)) return;

        if (entryMod instanceof NormalModule) {
          const isEntryResourceLocalFile = path.isAbsolute(entryMod.resource);
          const entryResourcePath = entryMod.resourceResolveData?.path;
          if (
            isEntryResourceLocalFile &&
            typeof entryResourcePath === 'string' &&
            !isPathExcluded(entryResourcePath)
          ) {
            // Collects the dependency closest to root as the entry dependency.
            if (!entryDeps.has(entryResourcePath)) {
              entryDeps.set(entryResourcePath, entryDep);
            }
          }
        }

        touchedMods.add(entryMod);
        walkDependenciesSync(entryMod, collectEntryDepsRecursively);
      }

      async function makeExtDepsRecursively(entryDep: Dependency): Promise<void> {
        const entryMod = compilation.moduleGraph.getModule(entryDep);
        if (!entryMod || touchedMods.has(entryMod)) return;

        let isEntryModExcluded = false;
        if (entryMod instanceof NormalModule) {
          const entryResourcePath = entryMod.resourceResolveData?.path;
          isEntryModExcluded =
            typeof entryResourcePath !== 'string' ||
            !entryResourcePaths.includes(entryResourcePath);
        }
        if (isEntryModExcluded) return;

        const allDependencies = new Set<Dependency>(entryMod.dependencies);
        for (const b of entryMod.blocks) {
          for (const d of b.dependencies) {
            allDependencies.add(d);
          }
        }

        await walkDependencies(entryMod, (d, i, deps) =>
          makeExtDepToReplaceChildDepIfNotInSameResourcePath(deps, i, entryDep)
        );

        touchedMods.add(entryMod);
        for (const d of allDependencies) await makeExtDepsRecursively(d);
      }

      async function makeExtDepToReplaceChildDepIfNotInSameResourcePath(
        childDependencies: Dependency[],
        childDepIndex: number,
        entryDep: Dependency
      ): Promise<void> {
        const childDep = childDependencies[childDepIndex];
        const childMod = compilation.moduleGraph.getModule(childDep);

        if (!(childMod instanceof NormalModule)) return;
        const childResourcePath: unknown = childMod.resourceResolveData?.path;

        const entryMod = compilation.moduleGraph.getModule(entryDep);
        const entryParentMod = compilation.moduleGraph.getParentModule(entryDep);
        let entryResourcePath: unknown;
        if (entryMod instanceof NormalModule) {
          entryResourcePath = entryMod.resourceResolveData?.path;
        } else if (entryParentMod instanceof NormalModule) {
          entryResourcePath = entryParentMod.resourceResolveData?.path;
        } else return;

        if (typeof childResourcePath !== 'string' || typeof entryResourcePath !== 'string') return;
        if (childResourcePath === entryResourcePath) return;

        // Makes the requireable relative path for the external mod.
        const entryBundlePath = evaluateBundlePath(entryResourcePath);
        const childBundlePath = evaluateBundlePath(childResourcePath);
        let request = path.relative(path.dirname(entryBundlePath), childBundlePath);
        if (!path.isAbsolute(request) && !request.startsWith('.')) {
          request = `.${path.sep}${request}`;
        }
        request = request.replace(/\\/g, path.posix.sep);

        const extModCandidate = new TranspileExternalModule(
          request,
          externalModuleTypeCjs,
          entryResourcePath
        );
        let extMod = compilation.getModule(extModCandidate);
        let doesExtModNeedBuild = false;
        if (!(extMod instanceof ExternalModule)) {
          if (compilation.profile) {
            compilation.moduleGraph.setProfile(extModCandidate, new ModuleProfile());
          }
          const extModReturned = await promisify(compilation.addModule).call(
            compilation,
            extModCandidate
          );
          // Uses extModReturned prior to extModCandidate in case some cached module
          // is used in compilation.addModule.
          extMod = extModReturned ?? extModCandidate;
          doesExtModNeedBuild = true;
        }

        // Clones child dep to make external dep for connecting external mod so that
        // connections of child dep get preserved for making entries.
        const extDep = clone(childDep);
        childDependencies[childDepIndex] = extDep;

        const childConnection = compilation.moduleGraph.getConnection(childDep);
        if (childConnection) {
          const entryMgm = compilation.moduleGraph._getModuleGraphModule(entryMod);
          entryMgm.outgoingConnections.delete(childConnection);
        }

        compilation.moduleGraph.setResolvedModule(entryMod, extDep, extMod);
        compilation.moduleGraph.setIssuerIfUnset(extMod, entryMod);

        if (doesExtModNeedBuild) {
          await promisify(compilation.buildModule).call(compilation, extMod);
        }
      }

      function evaluateBundlePath(resourcePath: string): string {
        let bundlePath = resourcePath;
        if (entryResourcePaths.includes(resourcePath)) {
          if (hoistNodeModules) {
            const matchesNodeModules = resourcePath.match(reNodeModules);
            if (matchesNodeModules) {
              bundlePath = path.resolve(
                outputPathOfNodeModules,
                resourcePath.substring(matchesNodeModules.index! + matchesNodeModules[0].length)
              );
            } else {
              bundlePath = path.resolve(
                outputPath,
                path.relative(commonDirWoNodeModules, resourcePath)
              );
            }
          } else {
            bundlePath = path.resolve(outputPath, path.relative(commonDir, resourcePath));
          }

          const bundlePathParsed = path.parse(bundlePath);
          const bundlePathNewExt = extentionMapping[bundlePathParsed.ext];
          if (typeof bundlePathNewExt === 'string') {
            bundlePath = path.format({
              ...bundlePathParsed,
              ext: bundlePathNewExt,
              base: bundlePathParsed.name + bundlePathNewExt,
            });
          }
        }
        return bundlePath;
      }

      function evaluateBundleRelPath(resourcePath: string): string {
        return path.relative(outputPath, evaluateBundlePath(resourcePath));
      }

      function makeEntriesAndCollectEntryExtentions(): void {
        for (const [entryResourcePath, entryDep] of entryDeps) {
          const entryBundleRelPath = evaluateBundleRelPath(entryResourcePath);
          const entryBundleRelPathParsed = path.parse(entryBundleRelPath);

          if (entryBundleRelPathParsed.ext === extJson) {
            emitJson(entryBundleRelPath, entryResourcePath, entryDep);
          } else {
            assignEntry(entryBundleRelPath, entryDep);

            const entryMod = compilation.moduleGraph.getModule(entryDep);
            if (entryMod) {
              if (!entryMod.type.startsWith(sourceTypeAsset)) {
                entryExtentionsToHaveSourceMaps.add(entryBundleRelPathParsed.ext);
              }
            }
          }
        }
      }

      function emitJson(
        entryBundleRelPath: string,
        entryResourcePath: string,
        entryDep: Dependency
      ): void {
        const entryMod = compilation.moduleGraph.getModule(entryDep);
        if (entryMod instanceof NormalModule) {
          const { jsonData } = entryMod.buildInfo;
          if (!jsonData) {
            throw new Error(
              `${pluginName}${os.EOL}File '${path.relative(
                context,
                entryResourcePath
              )}' is not type of JSON`
            );
          }
          entryMod.buildInfo.assets = {
            [entryBundleRelPath]: new RawSource(JSON.stringify(jsonData.get())),
          };
        }
      }

      function assignEntry(entryBundleRelPath: string, entryDep: Dependency): void {
        const name = entryBundleRelPath;
        const filename = entryBundleRelPath;
        entries.set(name, {
          dependencies: [entryDep],
          includeDependencies: [],
          options: { name, filename },
        });
      }
    });
  }
}
