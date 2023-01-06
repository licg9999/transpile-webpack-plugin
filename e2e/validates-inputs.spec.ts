import {
  boolToText,
  execWebpack,
  mapStrToText,
  rootPath,
  setupWebpackProject,
} from '../support-helpers';

describe('validates compiler options', () => {
  function setup(validOpts: { hmr?: boolean }) {
    setupWebpackProject({
      'webpack.config.js': `
const { HotModuleReplacementPlugin } = require('webpack');
const Plugin = require('${rootPath}');
module.exports = {
  plugins: [
    ${boolToText(validOpts.hmr, '', 'new HotModuleReplacementPlugin(),')}
    new Plugin(),
  ],
};
`,
    });
  }

  it('throws error if hot module replacement enabled', () => {
    setup({ hmr: false });
    const { status, stderr } = execWebpack();
    expect(status).toBeGreaterThan(0);
    expect(stderr).toIncludeMultiple(['Error', 'Hot module replacement']);
  });
});

describe('validates options', () => {
  function setup(validOpts: {
    exclude?: boolean;
    hoistNodeModules?: boolean;
    longestCommonDir?: boolean | string;
    extentionMapping?: boolean;
    preferResolveByDependencyAsCjs?: boolean;
  }) {
    setupWebpackProject({
      'webpack.config.js': `
const Plugin = require('${rootPath}');
module.exports = {
  entry: './src/index.js',
  plugins: [
    new Plugin({
      ${boolToText(validOpts.exclude, 'exclude: /bower_components/,', 'exclude: false,')}
      ${boolToText(validOpts.hoistNodeModules, 'hoistNodeModules: false,', 'hoistNodeModules: 0,')}
      ${mapStrToText(
        validOpts.longestCommonDir,
        (s) => `longestCommonDir: '${s}',`,
        (b) => boolToText(b, 'longestCommonDir: __dirname,', 'longestCommonDir: 0,')
      )}
      ${boolToText(validOpts.extentionMapping, 'extentionMapping: {},', 'extentionMapping: 0,')}
      ${boolToText(
        validOpts.preferResolveByDependencyAsCjs,
        'preferResolveByDependencyAsCjs: true,',
        'preferResolveByDependencyAsCjs: 0,'
      )}
    }),
  ],
};
`,
      'src/index.js': '',
    });
  }

  it('throws error if exclude not valid in format', () => {
    setup({ exclude: false });
    const { status, stderr } = execWebpack();
    expect(status).toBeGreaterThan(0);
    expect(stderr).toIncludeMultiple(['Invalid', 'exclude']);
  });

  it('throws error if hoistNodeModules not valid in format', () => {
    setup({ hoistNodeModules: false });
    const { status, stderr } = execWebpack();
    expect(status).toBeGreaterThan(0);
    expect(stderr).toIncludeMultiple(['Invalid', 'hoistNodeModules']);
  });

  it('throws error if longestCommonDir not valid in format', () => {
    setup({ longestCommonDir: false });
    const { status, stderr } = execWebpack();
    expect(status).toBeGreaterThan(0);
    expect(stderr).toIncludeMultiple(['Invalid', 'longestCommonDir']);
  });

  it(`throws error if longestCommonDir doesn't exist`, () => {
    setup({ longestCommonDir: './src/some/where' });
    const { status, stderr } = execWebpack();
    expect(status).toBeGreaterThan(0);
    expect(stderr).toIncludeMultiple(['Error', 'longestCommonDir', './src/some/where']);
  });

  it('throws error if extentionMapping not valid in format', () => {
    setup({ extentionMapping: false });
    const { status, stderr } = execWebpack();
    expect(status).toBeGreaterThan(0);
    expect(stderr).toIncludeMultiple(['Invalid', 'extentionMapping']);
  });

  it('throws error if preferResolveByDependencyAsCjs not valid in format', () => {
    setup({ preferResolveByDependencyAsCjs: false });
    const { status, stderr } = execWebpack();
    expect(status).toBeGreaterThan(0);
    expect(stderr).toIncludeMultiple(['Invalid', 'preferResolveByDependencyAsCjs']);
  });
});

describe('validates entries', () => {
  it(`throws error if no entry found outside 'node_modules'`, () => {
    setupWebpackProject({
      'webpack.config.js': `
const Plugin = require('${rootPath}');
module.exports = {
  entry: require.resolve('lodash'),
  plugins: [new Plugin()],
};
`,
    });
    const { status, stderr } = execWebpack();
    expect(status).toBeGreaterThan(0);
    expect(stderr).toIncludeMultiple(['Error', 'No entry', `outside 'node_modules'`]);
  });

  it(`prints warning if any '.mjs' file found with target 'node'`, () => {
    setupWebpackProject({
      'webpack.config.js': `
const Plugin = require('${rootPath}');
module.exports = {
  mode: 'production',
  target: 'node',
  output: {
    path: __dirname + '/dist',
  },
  entry: './src/index.mjs',
  plugins: [new Plugin()],
};
`,
      'src/index.mjs': '',
    });
    const { status, stdout } = execWebpack();
    expect(status).toBe(0);
    expect(stdout).toIncludeMultiple(['WARNING', `'.mjs' files`, './src/index.mjs']);
  });

  it(`throws error if any '.json' file is not type of JSON`, () => {
    setupWebpackProject({
      'webpack.config.js': `
const Plugin = require('${rootPath}');
module.exports = {
  entry: './src/index.js',
  module: {
    rules: [
      {
        test: /\\.json$/,
        type: 'javascript/auto',
      }
    ]
  },
  plugins: [new Plugin()],
};
`,
      'src/index.js': `
import './constants.json';
`,
      'src/constants.json': '{}',
    });
    const { status, stderr } = execWebpack();
    expect(status).toBeGreaterThan(0);
    expect(stderr).toIncludeMultiple(['Error', 'not type of JSON']);
  });
});
