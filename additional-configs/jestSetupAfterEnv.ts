import waitForExpect from 'wait-for-expect';

import {
  cleanAllWebpackProjects,
  createE2eDebuglogByFilePath,
  killAllExecAsyncProcesses,
} from '../support-helpers';

const debuglog = createE2eDebuglogByFilePath(__filename);

jest.setTimeout(60000);

waitForExpect.defaults.interval = 200;
waitForExpect.defaults.timeout = 10000;

cleanAllWebpackProjects();

afterAll(async () => {
  debuglog('Killing all the unkilled execAsync processes...');
  await killAllExecAsyncProcesses();
});
