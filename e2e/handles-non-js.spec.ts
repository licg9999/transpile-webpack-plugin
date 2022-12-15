import {
  evaluateMustHavePackageJsonText,
  execNode,
  execWebpack,
  expectCommonDirToIncludeAllFilesAnd,
  expectCommonDirToIncludeSameFilesAnd,
  rootPath,
  setupWebpackProject,
} from '../support-helpers';

const webpackConfigReusable = `
mode: 'production',
target: 'node',
output: {
  path: __dirname + '/dist',
},
`;

describe('handles json', () => {
  it('with default JSON parser, outputs .json file as JSON', () => {
    setupWebpackProject({
      'webpack.config.js': `
const Plugin = require('${rootPath}');
module.exports = {
  ${webpackConfigReusable}
  entry: './src/index.js',
  plugins: [new Plugin()],
};
`,
      'src/index.js': `
import { greeting } from './constants.json';
console.log(greeting);
`,
      'src/constants.json': `
{ "greeting": "Hi, there!" }
`,
    });
    expect(execWebpack().status).toBe(0);
    expectCommonDirToIncludeSameFilesAnd({
      'dist/index.js': (t) => expect(t).not.toInclude('Hi, there!'),
      'dist/constants.json': (t) => expect(JSON.parse(t)).toEqual({ greeting: 'Hi, there!' }),
    });
    const { stdout, status } = execNode('dist/index.js');
    expect(status).toBe(0);
    expect(stdout).toInclude('Hi, there!');
  });

  it('with JSON5 parser, outputs .json file w/ comment as JSON file w/o comment', () => {
    setupWebpackProject({
      'webpack.config.js': `
const Plugin = require('${rootPath}');
const JSON5 = require('json5');
module.exports = {
  ${webpackConfigReusable}
  entry: './src/index.js',
  module: {
    rules: [
      {
        test: /\\.json$/,
        parser: {
          parse: JSON5.parse,
        }
      }
    ] 
  },
  plugins: [new Plugin()]
};
`,
      'src/index.js': `
import { greeting } from './constants.json';
console.log(greeting);
`,
      'src/constants.json': `
{
  // First few words for a talk
  "greeting": "Hi, there!"
}
`,
    });
    expect(execWebpack().status).toBe(0);
    expectCommonDirToIncludeSameFilesAnd({
      'dist/index.js': (t) => expect(t).not.toInclude('Hi, there!'),
      'dist/constants.json': (t) => expect(JSON.parse(t)).toEqual({ greeting: 'Hi, there!' }),
    });
    const { stdout, status } = execNode('dist/index.js');
    expect(status).toBe(0);
    expect(stdout).toInclude('Hi, there!');
  });

  it('with JSON5 parser, outputs file with ext other than .json as equivalent same-ext JS file', () => {
    setupWebpackProject({
      'webpack.config.js': `
const Plugin = require('${rootPath}');
const JSON5 = require('json5');
module.exports = {
  ${webpackConfigReusable}
  entry: './src/index.js',
  module: {
    rules: [
      {
        test: /\\.jsonc$/,
        type: 'json',
        parser: {
          parse: JSON5.parse,
        },
      }
    ],
  },
  plugins: [new Plugin()],
};
`,
      'src/index.js': `
import { greeting } from './constants.jsonc';
console.log(greeting);
`,
      'src/constants.jsonc': `
{
  // First few words for a talk
  "greeting": "Hi, there!"
}
`,
    });
    expect(execWebpack().status).toBe(0);
    expectCommonDirToIncludeSameFilesAnd({
      'dist/index.js': (t) => expect(t).not.toInclude('Hi, there!'),
      'dist/constants.jsonc': (t) =>
        expect(t).toIncludeMultiple(['__webpack_exports__', 'Hi, there!']),
    });
    const { stdout, status } = execNode('dist/index.js');
    expect(status).toBe(0);
    expect(stdout).toInclude('Hi, there!');
  });
});

describe('handles url', () => {
  it('bundles data url into output file of the importer', () => {
    setupWebpackProject({
      'webpack.config.js': `
const Plugin = require('${rootPath}');
module.exports = {
  ${webpackConfigReusable}
  entry: './src/index.js',
  plugins: [new Plugin()],
};
`,
      'src/index.js': `
import { greeting } from 'data:text/javascrip,export const greeting = \\'Hi, there!\\'';
console.log(greeting);
`,
    });
    expect(execWebpack().status).toBe(0);
    expectCommonDirToIncludeSameFilesAnd({
      'dist/index.js': (t) => expect(t).toInclude('Hi, there!'),
    });
    const { stdout, status } = execNode('dist/index.js');
    expect(status).toBe(0);
    expect(stdout).toInclude('Hi, there!');
  });

  it('bundles http url into output file of the importer', () => {
    setupWebpackProject({
      'webpack.config.js': `
const Plugin = require('${rootPath}');
module.exports = {
  ${webpackConfigReusable}
  entry: './src/index.js',
  experiments: {
    buildHttp: {
      allowedUris: ['https://cdn.skypack.dev/'],
      frozen: false,
    },
  },
  plugins: [new Plugin()],
};
`,
      'src/index.js': `
import { upperCase } from 'https://cdn.skypack.dev/lodash';
console.log(upperCase('Hi, there!'));
`,
    });
    expect(execWebpack().status).toBe(0);
    expectCommonDirToIncludeSameFilesAnd({
      'dist/index.js': (t) => expect(t).toIncludeMultiple(['.upperCase', '.cloneDeep']),
    });
    const { stdout, status } = execNode('dist/index.js');
    expect(status).toBe(0);
    expect(stdout).toInclude('HI THERE');
  });
});

describe('handles asset', () => {
  it(
    'with asset/resource, ' +
      'outputs asset file as same-ext JS file exporting url to the emitted asset',
    () => {
      setupWebpackProject({
        'webpack.config.js': `
const Plugin = require('${rootPath}');
module.exports = {
  ${webpackConfigReusable.replace(
    /output:\s*\{([^\}]*)\}/s,
    `output: {
  $1
  publicPath: '/public/',
}`
  )}
  entry: './src/index.js',
  module: {
    rules: [
      {
        test: /\\.txt$/,
        type: 'asset/resource',
        generator: {
          emit: false,
        },
      }
    ],
  },
  plugins: [new Plugin()],
};
`,
        'src/index.js': `
import textsUrl from './texts.txt';
console.log(textsUrl);
`,
        'src/texts.txt': 'Hi, there!',
      });
      expect(execWebpack().status).toBe(0);
      expectCommonDirToIncludeSameFilesAnd({
        'dist/index.js': (t) => {
          expect(t).not.toInclude('Hi, there!');
          expect(t).toInclude('require("./texts.txt")');
        },
        'dist/texts.txt': (t) => expect(t).toIncludeMultiple(['/public/', '.txt']),
      });
      const { stdout, status } = execNode('dist/index.js');
      expect(status).toBe(0);
      expect(stdout).toIncludeMultiple(['/public/', '.txt']);
    }
  );

  it(
    'with asset/inline, ' +
      'outputs asset file as same-ext JS file exporting data url of the asset',
    () => {
      setupWebpackProject({
        'webpack.config.js': `
const Plugin = require('${rootPath}');
module.exports = {
  ${webpackConfigReusable}
  entry: './src/index.js',
  module: {
    rules: [
      {
        test: /\\.txt$/,
        type: 'asset/inline',
      }
    ],
  },
  plugins: [new Plugin()],
};
`,
        'src/index.js': `
import { Buffer } from 'node:buffer';
import textsDataUrl from './texts.txt';
console.log(
  Buffer.from(textsDataUrl.substring(textsDataUrl.indexOf(',') + 1), 'base64').toString('utf8')
);
`,
        'src/texts.txt': 'Hi, there!',
      });
      expect(execWebpack().status).toBe(0);
      expectCommonDirToIncludeSameFilesAnd({
        'dist/index.js': (t) => {
          expect(t).not.toInclude('Hi, there!');
          expect(t).toInclude('require("./texts.txt")');
        },
        'dist/texts.txt': (t) => {
          expect(t).not.toInclude('Hi, there!');
          expect(t).toInclude('data:text/plain;base64');
        },
      });
      const { stdout, status } = execNode('dist/index.js');
      expect(status).toBe(0);
      expect(stdout).toInclude('Hi, there!');
    }
  );

  it(
    'with asset/source, ' +
      'outputs asset file as same-ext JS file exporting source code of the asset',
    () => {
      setupWebpackProject({
        'webpack.config.js': `
const Plugin = require('${rootPath}');
module.exports = {
  ${webpackConfigReusable}
  entry: './src/index.js',
  module: {
    rules: [
      {
        test: /\\.txt$/,
        type: 'asset/source',
      }
    ],
  },
  plugins: [new Plugin()],
};
`,
        'src/index.js': `
import { Buffer } from 'node:buffer';
import textsContent from './texts.txt';
console.log(textsContent);
`,
        'src/texts.txt': 'Hi, there!',
      });
      expect(execWebpack().status).toBe(0);
      expectCommonDirToIncludeSameFilesAnd({
        'dist/index.js': (t) => {
          expect(t).not.toInclude('Hi, there!');
          expect(t).toInclude('require("./texts.txt")');
        },
        'dist/texts.txt': (t) => expect(t).toInclude('Hi, there!'),
      });
      const { stdout, status } = execNode('dist/index.js');
      expect(status).toBe(0);
      expect(stdout).toInclude('Hi, there!');
    }
  );
});

describe('handles vue SFC', () => {
  it(
    'with vue-loader and its plugin, ' +
      'outputs .vue file as same-ext JS file containing logics of all blocks',
    () => {
      setupWebpackProject({
        'webpack.config.js': `
const Plugin = require('${rootPath}');
const { VueLoaderPlugin } = require('vue-loader');
module.exports = {
  ${webpackConfigReusable}
  entry: './src/index.js',
  module: {
    rules: [
      {
        test: /\\.js/,
        use: 'babel-loader',
      },
      {
        test: /\\.css/,
        use: [
          'vue-style-loader',
          'css-loader'
        ]
      },
      {
        test: /\\.vue$/,
        use: 'vue-loader',
      }
    ],
  },
  plugins: [new Plugin(), new VueLoaderPlugin()],
};
`,
        'src/index.js': `
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import App from './App.vue';
const app = createSSRApp(App);
renderToString(app).then(console.log);
`,
        'src/App.vue': `
<script>
export default {
  data() {
    return {
      greeting: 'Hi, there!'
    }
  }
}
</script>

<template>
  <h1>{{ greeting }}</h1>
</template>

<style>
h1 {
  font-size: 64px;
}
</style>
`,
        'package.json': evaluateMustHavePackageJsonText({
          ['dependencies']: {
            ['vue']: '^3.2.45',
          },
          ['devDependencies']: {
            ['@babel/core']: '^7.20.5',
            ['babel-loader']: '^9.1.0',
            ['css-loader']: '^6.7.2',
            ['vue-loader']: '^17.0.1',
            ['vue-style-loader']: '^4.1.3',
            ['vue-template-compiler']: '^2.7.14',
          },
        }),
      });
      expect(execWebpack().status).toBe(0);
      expectCommonDirToIncludeAllFilesAnd({
        'dist/index.js': (t) => {
          expect(t).not.toInclude('Hi, there!');
          expect(t).toInclude('require("./App.vue")');
        },
        'dist/App.vue': (t) =>
          expect(t).toIncludeMultiple([
            'greeting:',
            'Hi, there!',
            '<h1',
            'h1>',
            'font-size:',
            '64px',
          ]),
      });
      const { stdout, status } = execNode('dist/index.js');
      expect(status).toBe(0);
      expect(stdout).toInclude('<h1>Hi, there!</h1>');
    }
  );
});