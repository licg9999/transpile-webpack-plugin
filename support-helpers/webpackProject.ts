import { blueBright, dim } from 'colorette';
import crossSpawn from 'cross-spawn';
import glob from 'glob';
import { merge } from 'lodash';
import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import {
  encodingText,
  rootPath,
  webpackConfigDefaultFileName,
  webpackProjectMustHaveFiles,
  webpackProjectMustHavePackageJson,
  webpackProjectParentDirName,
} from './constants';
import { logStdout } from './logging';

export function setupWebpackProject(
  files: Record<string, string> & { [webpackConfigDefaultFileName]: string }
): void {
  const { testPath } = expect.getState();

  if (!testPath) {
    throw new Error('Required fields are not returned from expect.getState()');
  }

  const projectPath = path.join(path.dirname(testPath), webpackProjectParentDirName, uuidv4());

  fs.mkdirSync(projectPath, { recursive: true });

  process.chdir(projectPath);

  let packageJsonText: string = '{}';
  for (const [filePath, fileText] of Object.entries({
    ...webpackProjectMustHaveFiles,
    ...files,
  })) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, fileText, encodingText);
    if (filePath === 'package.json') {
      packageJsonText = fileText;
    }
  }

  const { status } = crossSpawn.sync('npm', ['i'], { encoding: encodingText, stdio: 'ignore' });
  expect(status).toBe(0);

  logStdout(
    `Did setup webpack project in: ${blueBright(
      path.relative(rootPath, projectPath)
    )}, with package.json ${dim(JSON.stringify(JSON.parse(packageJsonText), null, 0))}`
  );
}

export function cleanAllWebpackProjects() {
  for (const p of glob.sync(`**/${webpackProjectParentDirName}/`, {
    absolute: true,
    cwd: rootPath,
    ignore: '**/node_modules/**',
  })) {
    try {
      fs.rmSync(p, { recursive: true });
      logStdout(`Did clean webpack projects under: ${blueBright(path.relative(rootPath, p))}`);
    } catch {}
  }
}

export function evaluateMustHavePackageJsonText(packageJsonOverride: object): string {
  return JSON.stringify(merge({}, webpackProjectMustHavePackageJson, packageJsonOverride));
}
