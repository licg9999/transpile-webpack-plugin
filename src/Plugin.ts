import { clone } from 'lodash';
import path from 'path';
import { validate } from 'schema-utils';
import { promisify } from 'util';
import { Compiler, Dependency, ExternalModule, Module, NormalModule, sources } from 'webpack';
import ModuleProfile from 'webpack/lib/ModuleProfile';
import { commonDirSync } from './commonDir';
import {
  forceDisableSplitChunks,
  forceSetLibraryType,
  throwErrIfOutputPathNotSpecified,
  throwErrIfTargetNotSupported,
  unifyDependencyResolving,
} from './compilerOptions';
import { Condition, createConditionTest } from './conditionTest';
import {
  baseNodeModules,
  extJson,
  moduleType,
  pluginName,
  reNodeModules,
  sourceTypeAsset,
  stageVeryEarly,
} from './constants';
import optionsSchema from './optionsSchema.json';
import { SourceMapDevToolPluginController } from './SourceMapDevToolPluginController';
import { walkDependencies, walkDependenciesSync } from './walkDependencies';

const { RawSource } = sources;

export type TranspileWebpackPluginOptions = Partial<TranspileWebpackPluginInternalOptions>;

export interface TranspileWebpackPluginInternalOptions {
  exclude: Condition;
  hoistNodeModules: boolean;
}

export class TranspileWebpackPlugin {
  options: TranspileWebpackPluginInternalOptions;
  sourceMapDevToolPluginController: SourceMapDevToolPluginController;

  constructor(options: TranspileWebpackPluginOptions = {}) {
    validate(optionsSchema, options, {
      name: pluginName,
      baseDataPath: 'options',
    });

    this.options = {
      exclude: options.exclude ?? [],
      hoistNodeModules: options.hoistNodeModules ?? true,
    };
    this.sourceMapDevToolPluginController = new SourceMapDevToolPluginController();
  }

  apply(compiler: Compiler) {
    const { exclude, hoistNodeModules } = this.options;

    throwErrIfOutputPathNotSpecified(compiler.options);
    throwErrIfTargetNotSupported(compiler.options);
    forceDisableSplitChunks(compiler.options);
    forceSetLibraryType(compiler.options, moduleType);

    const outputPath = compiler.options.output.path!;
    const outputPathOfNodeModules = path.resolve(outputPath, baseNodeModules);

    const resolveExtensions = compiler.options.resolve.extensions ?? [];

    const isPathExcluded = createConditionTest(exclude);
    const isPathInNodeModules = createConditionTest(reNodeModules);

    this.sourceMapDevToolPluginController.apply(compiler);

    compiler.hooks.environment.tap({ name: pluginName, stage: stageVeryEarly }, () => {
      unifyDependencyResolving(compiler.options, moduleType.split('-')[0]);
    });

    compiler.hooks.finishMake.tapPromise(pluginName, async (compilation) => {
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
        throw new Error(`No entry is found ouside 'node_modules'`);
      }

      const commonDir = commonDirSync(entryResourcePaths);
      const commonDirWoNodeModules = commonDirSync(entryResourcePathsWoNodeModules);
      for (const entryDep of entryDeps.values()) {
        await makeExtDepsRecursively(entryDep);
      }
      touchedMods.clear();

      const entries = new Map() as typeof compilation.entries;
      const entryExtentions = new Set<string>();
      makeEntriesAndCollectEntryExtentions();
      entryDeps.clear();
      this.sourceMapDevToolPluginController.setExtensionsHavingSourceMaps(entryExtentions);
      entryExtentions.clear();
      compilation.entries.clear();
      compilation.entries = entries;

      /* **** */

      function collectEntryDepsRecursively(entryDep: Dependency): void {
        const entryMod = compilation.moduleGraph.getModule(entryDep);
        if (!entryMod || touchedMods.has(entryMod)) return;

        if (entryMod instanceof NormalModule) {
          const entryResourcePath = entryMod.resourceResolveData?.path;
          if (typeof entryResourcePath === 'string' && !isPathExcluded(entryResourcePath)) {
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

        const extModCandidate = new ExternalModule(request, moduleType, request);
        let extMod = compilation.getModule(extModCandidate);
        if (!(extMod instanceof ExternalModule)) {
          compilation.moduleGraph.setProfile(extModCandidate, new ModuleProfile());
          await promisify(compilation.addModule).call(compilation, extModCandidate);
          extMod = extModCandidate;
        }

        // Clones the child dep to make an external dep for connecting the external mod so to
        // preserve the current connection of the child dep for making more potential entries.
        const extDep = clone(childDep);
        childDependencies[childDepIndex] = extDep;

        compilation.moduleGraph.setResolvedModule(entryMod, extDep, extMod);
        compilation.moduleGraph.setIssuerIfUnset(extMod, entryMod);

        await promisify(compilation.buildModule).call(compilation, extMod);
      }

      function evaluateBundlePath(resourcePath: string): string {
        if (entryResourcePaths.includes(resourcePath)) {
          if (hoistNodeModules) {
            const matchesNodeModules = resourcePath.match(reNodeModules);
            if (matchesNodeModules) {
              return path.resolve(
                outputPathOfNodeModules,
                resourcePath.substring(matchesNodeModules.index! + matchesNodeModules[0].length)
              );
            } else {
              return path.resolve(outputPath, path.relative(commonDirWoNodeModules, resourcePath));
            }
          } else {
            return path.resolve(outputPath, path.relative(commonDir, resourcePath));
          }
        }
        return resourcePath;
      }

      function evaluateBundleRelPath(resourcePath: string): string {
        return path.relative(outputPath, evaluateBundlePath(resourcePath));
      }

      function makeEntriesAndCollectEntryExtentions(): void {
        for (const [entryResourcePath, entryDep] of entryDeps) {
          const bundleRelPath = evaluateBundleRelPath(entryResourcePath);
          const bundleRelPathParsed = path.parse(bundleRelPath);

          if (bundleRelPathParsed.ext === extJson) {
            emitJson(bundleRelPath, entryDep);
          } else {
            assignEntry(bundleRelPath, entryDep);

            if (resolveExtensions.includes(bundleRelPathParsed.ext)) {
              assignEntry(
                path.format({
                  ...bundleRelPathParsed,
                  ext: '',
                  base: bundleRelPathParsed.name,
                }),
                entryDep
              );
            }

            const entryMod = compilation.moduleGraph.getModule(entryDep);
            if (entryMod) {
              if (!entryMod.getSourceTypes().has(sourceTypeAsset)) {
                entryExtentions.add(bundleRelPathParsed.ext);
              }
            }
          }
        }
      }

      function emitJson(entryBundleRelPath: string, entryDep: Dependency): void {
        const entryMod = compilation.moduleGraph.getModule(entryDep);
        if (entryMod instanceof NormalModule) {
          const jsonData: object = entryMod.buildInfo.jsonData?.get() ?? {};
          entryMod.buildInfo.assets = {
            [entryBundleRelPath]: new RawSource(JSON.stringify(jsonData)),
          };
        }
      }

      function assignEntry(entryBundleRelPath: string, entryDep: Dependency): void {
        const name = entryBundleRelPath;
        const filename = entryBundleRelPath;
        const library = { type: moduleType };
        entries.set(name, {
          dependencies: [entryDep],
          includeDependencies: [],
          options: { name, filename, library },
        });
      }
    });
  }
}
