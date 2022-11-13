import type { Dependency, Module } from 'webpack';

export function walkDependenciesSync(
  m: Module,
  fn: (dep: Dependency, depIndex: number, dependencies: Dependency[]) => void
): void {
  for (let i = 0, n = m.dependencies.length; i < n; i++) {
    fn(m.dependencies[i], i, m.dependencies);
  }
  for (const b of m.blocks) {
    for (let i = 0, n = b.dependencies.length; i < n; i++) {
      fn(b.dependencies[i], i, b.dependencies);
    }
  }
}

export async function walkDependencies(
  m: Module,
  fn: (dep: Dependency, depIndex: number, dependencies: Dependency[]) => Promise<void>
): Promise<void> {
  for (let i = 0, n = m.dependencies.length; i < n; i++) {
    await fn(m.dependencies[i], i, m.dependencies);
  }
  for (const b of m.blocks) {
    for (let i = 0, n = b.dependencies.length; i < n; i++) {
      await fn(b.dependencies[i], i, b.dependencies);
    }
  }
}
