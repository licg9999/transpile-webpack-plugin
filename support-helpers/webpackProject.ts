import { gray } from 'colorette';
import crossSpawn from 'cross-spawn';
import glob from 'glob';
import { kebabCase } from 'lodash';
import fs from 'node:fs';
import path from 'node:path';
import {
  encodingText,
  rootPath,
  webpackConfigDefaultFileName,
  webpackProjectMustHaveFiles,
  webpackProjectParentDirName,
} from './constants';
import { logStdout } from './logging';

export function setupWebpackProject(
  files: Record<string, string> & { [webpackConfigDefaultFileName]: string }
): void {
  const { currentTestName, testPath } = expect.getState();

  if (!currentTestName || !testPath) {
    throw new Error('Required fields are not returned from expect.getState()');
  }

  const projectPath = path.join(
    path.dirname(testPath),
    webpackProjectParentDirName,
    `${path.basename(testPath)}-${kebabCase(currentTestName)}`
  );

  try {
    fs.rmSync(projectPath, { recursive: true });
  } catch {}
  fs.mkdirSync(projectPath, { recursive: true });

  process.chdir(projectPath);

  for (const [filePath, fileContent] of Object.entries({
    ...webpackProjectMustHaveFiles,
    ...files,
  })) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, fileContent, encodingText);
  }

  crossSpawn.sync('npm', ['i'], { encoding: encodingText });

  logStdout('> did setup webpack project in:', gray(path.relative(rootPath, projectPath)));
}

export function cleanAllWebpackProjects() {
  for (const p of glob.sync(`**/${webpackProjectParentDirName}`, {
    absolute: true,
    cwd: rootPath,
    ignore: '**/node_modules/**',
  })) {
    try {
      fs.rmSync(p, { recursive: true });
      logStdout('> did clean webpack projects under:', gray(path.relative(rootPath, p)));
    } catch {}
  }
}
