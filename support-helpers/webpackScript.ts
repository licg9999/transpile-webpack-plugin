import { SpawnSyncReturns } from 'child_process';
import { blueBright, gray } from 'colorette';
import crossSpawn from 'cross-spawn';
import { encodingText } from './constants';
import { createE2eDebuglogByFilePath, logStdout } from './logging';

const debuglog = createE2eDebuglogByFilePath(__filename);

export function execWebpack(args: string[] = []): SpawnSyncReturns<string> {
  const npxArgs = ['webpack', ...args];
  const ret = crossSpawn.sync('npx', npxArgs, { encoding: encodingText });
  logStdout(
    `Did run ${blueBright(npxArgs.join(' '))}, with exit code ${blueBright(String(ret.status))}`
  );
  (['stdout', 'stderr'] as const).forEach((k) => {
    if (ret[k]) debuglog(`[${k}]: ${gray(`${ret[k]}`)}`);
  });
  return ret;
}
