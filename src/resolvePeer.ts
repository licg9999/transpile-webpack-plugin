import { memoize } from 'lodash';
import resolve from 'resolve';

export const resolvePeer = memoize((id: string): string => {
  return resolve.sync(id, { basedir: process.cwd() });
});
