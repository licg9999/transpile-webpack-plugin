import { flatten } from 'lodash';

import { MaybeArray } from './types';

export type Condition = MaybeArray<string | RegExp | ConditionTest>;

export type ConditionTest = (p: string) => boolean;

export function createConditionTest(condition: Condition): ConditionTest {
  const conditionAsArray = flatten([condition]);

  return (p) =>
    conditionAsArray.reduce(
      (b, c) =>
        b ||
        (typeof c === 'string' && p.startsWith(c)) ||
        (c instanceof RegExp && c.test(p)) ||
        (typeof c === 'function' && c(p)),
      false
    );
}
