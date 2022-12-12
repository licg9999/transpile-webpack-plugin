import { dim, magentaBright } from 'colorette';
import os from 'node:os';
import path from 'node:path';
import tty from 'node:tty';
import { debuglog, DebugLoggerFunction, inspect, InspectOptions } from 'node:util';
import { packageName } from '../src/constants';
import { rootPath } from './constants';

export function createLog(ws: tty.WriteStream): (...args: unknown[]) => void {
  const inspectOpts: InspectOptions = { colors: ws.hasColors?.() };
  return (...args) => {
    const prefix = evaluateLogPrefix();
    if (prefix) {
      args.unshift(prefix);
    }
    ws.write(
      args.map((o) => (typeof o === 'string' ? o : inspect(o, inspectOpts))).join(' ') + os.EOL
    );
  };
}

export const logStdout = createLog(process.stdout);
export const logStderr = createLog(process.stderr);

export function createE2eDebuglogByFilePath(filePath: string): DebugLoggerFunction {
  const fn = debuglog(`${packageName}:e2e:${path.relative(rootPath, filePath)}`);
  return (msg, ...params) => {
    const prefix = evaluateLogPrefix();
    if (prefix) {
      msg = `${prefix} ${msg}`;
    }
    fn(msg, ...params);
  };
}

function evaluateLogPrefix(): string | false {
  const { currentTestName, testPath } = expect.getState();

  const prefixParts = [];

  if (testPath) {
    prefixParts.push(path.relative(rootPath, testPath));
  }

  if (currentTestName) {
    prefixParts.push(currentTestName);
  }

  if (!prefixParts.length) {
    return false;
  }

  return dim(magentaBright(`[${prefixParts.join(' - ')}]:`));
}
