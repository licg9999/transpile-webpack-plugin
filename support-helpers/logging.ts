import os from 'node:os';
import tty from 'node:tty';
import { inspect, InspectOptions } from 'node:util';

export function createLog(ws: tty.WriteStream): (...args: unknown[]) => void {
  return (...args) => {
    const inspectOpts: InspectOptions = { colors: ws.hasColors?.() };
    ws.write(
      args.map((o) => (typeof o === 'string' ? o : inspect(o, inspectOpts))).join(' ') + os.EOL
    );
  };
}

export const logStdout = createLog(process.stdout);
export const logStderr = createLog(process.stderr);
