import {
  boolToText,
  execWebpack,
  rootPathAsLiteral,
  setupWebpackProject,
} from '../support-helpers';

describe('validates compiler options', () => {
  function setup(opts: { target?: boolean }) {
    setupWebpackProject({
      'webpack.config.js': `
const Plugin = require(${rootPathAsLiteral});
module.exports = {
  ${boolToText(opts.target, `target: 'node',`, `target: 'webworker',`)}
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
  function setup(opts: { exclude?: boolean; hoistNodeModules?: boolean }) {
    setupWebpackProject({
      'webpack.config.js': `
const Plugin = require(${rootPathAsLiteral});
module.exports = {
  target: 'node',
  plugins: [
    new Plugin({
      ${boolToText(opts.exclude, `exclude: /bower_components/,`, `exclude: false,`)}
      ${boolToText(opts.hoistNodeModules, `hoistNodeModules: false,`, `hoistNodeModules: 0,`)}
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
