import fs, { PathLike } from 'node:fs';

export function readJsonSync<
  T extends Record<string, string | number | boolean | null | undefined>
>(p: PathLike): T {
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
}
