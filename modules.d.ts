import { Module, ModuleGraphConnection } from 'webpack';

declare module 'webpack' {
  class ModuleGraphModule {
    incomingConnections: Set<ModuleGraphConnection>;
    outgoingConnections: Set<ModuleGraphConnection>;
  }

  class ModuleGraph {
    _getModuleGraphModule(module: Module): ModuleGraphModule;
  }
}
