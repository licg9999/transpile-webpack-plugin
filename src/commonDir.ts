import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { pluginName } from './constants';

function longestCommonPrefix(strs: string[]): string {
  if (!strs.length) return '';

  let k = strs[0].length;
  for (let i = 1, n = strs.length; i < n; i++) {
    k = Math.min(k, strs[i].length);
    for (let j = 0; j < k; j++)
      if (strs[i][j] !== strs[0][j]) {
        k = j;
        break;
      }
  }
  return strs[0].substring(0, k);
}

function isDir(p: string): boolean {
  try {
    if (!fs.statSync(p).isDirectory()) throw 0;
    return true;
  } catch {
    return false;
  }
}

function normalizePath(p: string, opts: { context?: string }): string {
  return opts.context ? path.resolve(opts.context, p) : path.normalize(p);
}

export function commonDirSync(
  filePaths: string[],
  opts: { context?: string; longestCommonDir?: string } = {}
): string {
  let prefix = longestCommonPrefix(filePaths.map((p) => normalizePath(p, opts)));

  if (!isDir(prefix)) {
    prefix = path.dirname(prefix);
    if (!isDir(prefix)) {
      throw new Error(`${pluginName}${os.EOL}No valid common dir is figured out`);
    }
  }

  if (opts.longestCommonDir) {
    const finalLongestCommonDir = normalizePath(opts.longestCommonDir, opts);

    if (!isDir(finalLongestCommonDir)) {
      throw new Error(
        `${pluginName}${os.EOL}The longestCommonDir '${opts.longestCommonDir}' doesn't exist`
      );
    }

    if (prefix.startsWith(finalLongestCommonDir)) {
      prefix = finalLongestCommonDir;
    }
  }

  return prefix;
}
