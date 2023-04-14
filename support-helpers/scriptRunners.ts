import { ChildProcess, SpawnOptions, SpawnSyncReturns } from 'node:child_process';
import { promisify } from 'node:util';

import { blueBright, dim } from 'colorette';
import crossSpawn from 'cross-spawn';
import treeKill from 'tree-kill';

import { encodingText } from './constants';
import { createE2eDebuglogByFilePath, logStdout } from './logging';

const debuglog = createE2eDebuglogByFilePath(__filename);

const defaultSpawnOptions: SpawnOptions = {
  stdio: 'pipe',
  env: { ...process.env, NO_COLOR: 'true' },
};

export function exec(cmd: string, ...args: string[]): SpawnSyncReturns<string> {
  const ret = crossSpawn.sync(cmd, args, {
    ...defaultSpawnOptions,
    encoding: encodingText,
  });
  logStdout(
    `Did run ${blueBright([cmd, ...args].join(' '))}, with exit code ${blueBright(
      String(ret.status)
    )}.`
  );
  (['stdout', 'stderr'] as const).forEach((k) => {
    if (ret[k]) debuglog(`[${k}]: ${dim(`${ret[k]}`)}`);
  });
  return ret;
}

const KeyOfExecAsyncPidsInExpectState = 'execAsyncPids';

export function execAsync(
  cmd: string,
  ...args: string[]
): ChildProcess & {
  getStdoutAsString(): string;
  getStderrAsString(): string;
} {
  const enhancedProc = crossSpawn(cmd, args, { ...defaultSpawnOptions });

  const expectState = expect.getState();
  const pids: number[] = expectState[KeyOfExecAsyncPidsInExpectState] ?? [];
  pids.push(enhancedProc.pid!);
  expect.setState({ ...expectState, [KeyOfExecAsyncPidsInExpectState]: pids });

  const cmdAsString = [cmd, ...args].join(' ');
  logStdout(`Running ${blueBright(cmdAsString)} ...`);

  const stdoutAsStrings: string[] = [];
  const stderrAsStrings: string[] = [];
  (
    [
      ['stdout', stdoutAsStrings],
      ['stderr', stderrAsStrings],
    ] as const
  ).forEach(([k, asStrings]) => {
    enhancedProc[k]?.on('data', (b: Buffer) => {
      const s = b.toString(encodingText);
      asStrings.push(s);
      debuglog(`[${k}]: ${dim(`${s}`)}`);
    });
  });

  enhancedProc.on('close', (status) => {
    logStdout(`Did run ${blueBright(cmdAsString)}, with exit code ${blueBright(String(status))}.`);
  });

  return Object.assign(enhancedProc, {
    getStdoutAsString: () => stdoutAsStrings.join(''),
    getStderrAsString: () => stderrAsStrings.join(''),
  });
}

export async function killExecAsyncProcess(pid: number): Promise<void> {
  const expectState = expect.getState();
  await promisify(treeKill)(pid);
  debuglog(`Did kill execAsync process id ${blueBright(pid)}.`);
  const latestPids: number[] = expectState[KeyOfExecAsyncPidsInExpectState] ?? [];
  const leftPids = latestPids.filter((i) => i !== pid);
  expect.setState({ ...expectState, [KeyOfExecAsyncPidsInExpectState]: leftPids });
}

export async function killAllExecAsyncProcesses(): Promise<void> {
  const expectState = expect.getState();
  const pids: number[] = expectState[KeyOfExecAsyncPidsInExpectState] ?? [];
  for (const pid of pids) {
    await promisify(treeKill)(pid);
    debuglog(`Did kill execAsync process id ${blueBright(pid)}.`);
  }
  const latestPids: number[] = expectState[KeyOfExecAsyncPidsInExpectState] ?? [];
  const leftPids = latestPids.filter((i) => !pids.includes(i));
  expect.setState({ ...expectState, [KeyOfExecAsyncPidsInExpectState]: leftPids });
}

export function execWebpack(...args: string[]) {
  return exec('npx', 'webpack', ...args);
}

export function execWebpackAsync(...args: string[]) {
  return execAsync('npx', 'webpack', ...args);
}

export function execNode(...args: string[]) {
  return exec('node', ...args);
}

export function execNodeAsync(...args: string[]) {
  return execAsync('node', ...args);
}
