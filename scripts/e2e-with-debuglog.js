#!/usr/bin/env node

const { name: packageName } = require('../package.json');
const crossSpawn = require('cross-spawn');

const [, , section] = process.argv;

process.env.NODE_DEBUG = `${packageName}:${section ?? '*'}`;

crossSpawn.sync('npm', ['run', 'e2e'], { stdio: 'inherit' });
