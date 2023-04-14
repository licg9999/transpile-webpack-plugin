import {
  autoChWebpackProject,
  chdir,
  depVerWebpack,
  depVerWebpackCli,
  exec,
  execNode,
  execWebpack,
  expectCommonDirToIncludeAllFilesAnd,
  rootPath,
  writeFiles,
} from '../support-helpers';

it('works with webpack config in facebook/create-react-app', () => {
  autoChWebpackProject();
  exec('npm', 'init', '-y');
  exec('npm', 'i', '-D', 'create-react-app');
  exec('npx', 'create-react-app', 'the-app');
  chdir('the-app');
  writeFiles({
    'webpack.config.js': `
const Plugin = require(${JSON.stringify(rootPath)});

const envInQuestion = 'production';

process.env.NODE_ENV = envInQuestion;
const webpackConfig = require('react-scripts/config/webpack.config')(envInQuestion);

webpackConfig.entry = './src/server.js';

webpackConfig.plugins = webpackConfig.plugins.filter(
  (p) => p.constructor.name !== 'WebpackManifestPlugin'
);

webpackConfig.plugins.push(new Plugin());

module.exports = webpackConfig;
`,
    'src/server.js': `
import { renderToString } from 'react-dom/server';
import App from './App';

console.log(renderToString(<App />));
`,
  });
  exec('npm', 'i', `webpack@${depVerWebpack}`, `webpack-cli@${depVerWebpackCli}`);
  expect(execWebpack().status).toBe(0);
  expectCommonDirToIncludeAllFilesAnd({
    'build/App.js': (t) => expect(t).toInclude('Learn React'),
    'build/logo.svg': (t) => expect(t).toInclude('static/media/logo'),
    'build/server.js': (t) =>
      expect(t).not.toIncludeAnyMembers(['Learn React', 'static/media/logo']),
  });
  const { stdout, status } = execNode('build/server.js');
  expect(status).toBe(0);
  expect(stdout).toIncludeMultiple(['Learn React', 'static/media/logo']);
});

it('works with webpack config in vue/vue-cli', () => {
  autoChWebpackProject();
  exec('npm', 'init', '-y');
  exec('npm', 'i', '-D', '@vue/cli');
  exec('npx', 'vue', 'create', '-d', '-m', 'npm', 'the-app');
  chdir('the-app');
  writeFiles({
    'webpack.config.js': `
const Plugin = require(${JSON.stringify(rootPath)});

const envInQuestion = 'production';

process.env.NODE_ENV = envInQuestion;
const webpackConfig = require('@vue/cli-service/webpack.config');

webpackConfig.entry = './src/server.js';

webpackConfig.plugins.push(new Plugin());

module.exports = webpackConfig;
`,
    'src/server.js': `
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import App from './App.vue';
const app = createSSRApp(App);
renderToString(app).then(console.log);
`,
  });
  exec('npm', 'i', `webpack@${depVerWebpack}`, `webpack-cli@${depVerWebpackCli}`);
  expect(execWebpack().status).toBe(0);
  expectCommonDirToIncludeAllFilesAnd({
    'dist/App.vue': (t) => expect(t).toInclude('Vue.js App'),
    'dist/assets/logo.png': (t) => expect(t).toInclude('data:image/png;base64'),
    'dist/server.js': (t) =>
      expect(t).not.toIncludeAnyMembers(['Vue.js App', 'data:image/png;base64']),
  });
  const { stdout, status } = execNode('dist/server.js');
  expect(status).toBe(0);
  expect(stdout).toIncludeMultiple(['Vue.js App', 'data:image/png;base64']);
});
