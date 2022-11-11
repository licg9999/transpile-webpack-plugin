import { SpawnSyncReturns } from 'child_process';
import crossSpawn from 'cross-spawn';
import { encodingText } from './constants';

export function execWebpack(args: string[] = []): SpawnSyncReturns<string> {
  return crossSpawn.sync('npx', ['webpack', ...args], {
    stdio: 'pipe',
    encoding: encodingText,
  });
}
