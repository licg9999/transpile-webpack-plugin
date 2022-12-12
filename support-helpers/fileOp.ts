import glob from 'glob';
import { clone } from 'lodash';
import fs from 'node:fs';
import path from 'node:path';
import { commonDirSync } from '../src/commonDir';
import { encodingText } from './constants';

export type FilesMatching = Record<string, (fileText: string) => void>;

export function expectCommonDirToIncludeAllFiles(filePaths: string[]): void {
  filePaths = filePaths.map((fp) => path.normalize(fp));
  expect(filePathsInCommonDirOf(filePaths)).toIncludeAllMembers(filePaths);
}

export function expectCommonDirToIncludeAllFilesAnd(matching: FilesMatching): void {
  matching = normalizeFilesMatching(matching);

  const filePaths = Object.keys(matching);

  expectCommonDirToIncludeAllFiles(filePaths);

  for (const fp of filePaths) {
    matching[fp](fs.readFileSync(fp, encodingText));
  }
}

export function expectCommonDirToIncludeSameFiles(filePaths: string[]): void {
  filePaths = filePaths.map((fp) => path.normalize(fp));
  expect(filePathsInCommonDirOf(filePaths)).toIncludeSameMembers(filePaths);
}

export function expectCommonDirToIncludeSameFilesAnd(matching: FilesMatching): void {
  matching = normalizeFilesMatching(matching);

  const filePaths = Object.keys(matching);

  expectCommonDirToIncludeSameFiles(filePaths);

  for (const fp of filePaths) {
    matching[fp](fs.readFileSync(fp, encodingText));
  }
}

export function normalizeFilesMatching(inputMatching: FilesMatching): FilesMatching {
  const outputMatching = clone(inputMatching);
  for (const fp of Object.keys(inputMatching)) {
    const fn = outputMatching[fp];
    delete outputMatching[fp];
    outputMatching[path.normalize(fp)] = fn;
  }
  return outputMatching;
}

export function filePathsInCommonDirOf(filePaths: string[]): string[] {
  const commonDir = commonDirSync(filePaths);
  return glob.sync('**', { nodir: true, cwd: commonDir }).map((fp) => path.join(commonDir, fp));
}
