import resolve from 'resolve';

import { resolvePeer } from '../../resolvePeer';

module.exports = require(resolve.sync('terser-webpack-plugin', {
  basedir: resolvePeer('webpack'),
}));
