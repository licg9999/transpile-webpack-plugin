import {
  boolToText,
  execWebpack,
  rootPathAsLiteral,
  setupWebpackProject,
} from '../support-helpers';

describe('validates compiler options', () => {
  function setup(validOpts: { target?: boolean }) {
    setupWebpackProject({
      'webpack.config.js': `
const Plugin = require(${rootPathAsLiteral});
module.exports = {
  ${boolToText(validOpts.target, `target: 'node',`, `target: 'webworker',`)}
  plugins: [new Plugin()]
};`,
    });
  }

  it('throws error if target not specified', () => {
    setup({});
    const { status, stderr } = execWebpack();
    expect(status).toBeGreaterThan(0);
    expect(stderr).toIncludeMultiple(['Error', 'target', `'web'`]);
  });

  it('throws error if target not node-compatible', () => {
    setup({ target: false });
    const { status, stderr } = execWebpack();
    expect(status).toBeGreaterThan(0);
    expect(stderr).toIncludeMultiple(['Error', 'target', `'webworker'`]);
  });
});

describe('validates plugin options', () => {
  function setup(validOpts: { exclude?: boolean; hoistNodeModules?: boolean }) {
    setupWebpackProject({
      'webpack.config.js': `
const Plugin = require(${rootPathAsLiteral});
module.exports = {
  target: 'node',
  plugins: [
    new Plugin({
      ${boolToText(validOpts.exclude, `exclude: /bower_components/,`, `exclude: false,`)}
      ${boolToText(validOpts.hoistNodeModules, `hoistNodeModules: false,`, `hoistNodeModules: 0,`)}
    })
  ]
};`,
    });
  }

  it('throws error if exclude not valid', () => {
    setup({ exclude: false });
    const { status, stderr } = execWebpack();
    expect(status).toBeGreaterThan(0);
    expect(stderr).toIncludeMultiple(['Invalid', 'exclude']);
  });

  it('throws error if hoistNodeModules not valid', () => {
    setup({ hoistNodeModules: false });
    const { status, stderr } = execWebpack();
    expect(status).toBeGreaterThan(0);
    expect(stderr).toIncludeMultiple(['Invalid', 'hoistNodeModules']);
  });
});

describe('validates entries', () => {
  it(`throws error if no entry found outside 'node_modules'`, () => {
    setupWebpackProject({
      'webpack.config.js': `
const Plugin = require(${rootPathAsLiteral});
module.exports = {
  entry: require.resolve('lodash'),
  target: 'node',
  plugins: [new Plugin()]
};`,
    });
    execWebpack();
    const { status, stderr } = execWebpack();
    expect(status).toBeGreaterThan(0);
    expect(stderr).toIncludeMultiple(['Error', 'No entry', `outside 'node_modules'`]);
  });

  it(`throws error if any '.mjs' file found`, () => {
    setupWebpackProject({
      'webpack.config.js': `
const Plugin = require(${rootPathAsLiteral});
module.exports = {
  entry: './src/index.mjs',
  target: 'node',
  plugins: [new Plugin()]
};`,
      'src/index.mjs': '',
    });
    execWebpack();
    const { status, stderr } = execWebpack();
    expect(status).toBeGreaterThan(0);
    expect(stderr).toIncludeMultiple(['Error', `'.mjs' files`]);
  });
});
