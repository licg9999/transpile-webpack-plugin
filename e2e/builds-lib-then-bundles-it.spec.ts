import {
  chdir,
  execNode,
  execWebpack,
  expectCommonDirToIncludeSameFilesAnd,
  rootPath,
  setupWebpackProject,
  webpackConfigDefaultFileName,
} from '../support-helpers';

it('builds lib, then bundles it in app', () => {
  setupWebpackProject({
    [`app/${webpackConfigDefaultFileName}`]: `
module.exports = {
  entry: {
    app: './src/index.js'
  },
  mode: 'production',
  target: 'node',
  output: {
    path: __dirname + '/dist',
  },
};
`,
    'app/src/index.js': `
import { print } from '../../lib/dist';

print();
`,

    [`lib/${webpackConfigDefaultFileName}`]: `
const Plugin = require('${rootPath}');
module.exports = {
  entry: './src/index.js',
  mode: 'production',
  target: 'node',
  output: {
    path: __dirname + '/dist',
  },
  plugins: [new Plugin()],
};
`,
    'lib/src/index.js': `
import { greeting } from './constants';

export function print() {
  console.log(greeting);
}
`,
    'lib/src/constants.js': `
export const greeting = 'Hi, there!';
`,
  });
  chdir('lib');
  expect(execWebpack().status).toBe(0);
  expectCommonDirToIncludeSameFilesAnd({
    'dist/index.js': (t) => expect(t).not.toInclude('Hi, there'),
    'dist/constants.js': (t) => expect(t).toInclude('Hi, there'),
  });
  chdir('../app');
  expect(execWebpack().status).toBe(0);
  expectCommonDirToIncludeSameFilesAnd({
    'dist/app.js': (t) => expect(t).toIncludeMultiple(['print', 'Hi, there']),
  });
  const { stdout, status } = execNode('dist/app.js');
  expect(status).toBe(0);
  expect(stdout).toInclude('Hi, there!');
});
