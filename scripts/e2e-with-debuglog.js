#!/usr/bin/env node

const { program } = require('commander');
const { name: packageName } = require('../package.json');
const crossSpawn = require('cross-spawn');

program.option('-s,--section <string>');
program.parse();

process.env.NODE_DEBUG = `${packageName}:${program.section ?? '*'}`;

const moreArgs = program.args.length ? ['--', ...program.args] : [];

const { status } = crossSpawn.sync('npm', ['run', 'e2e', ...moreArgs], { stdio: 'inherit' });

process.exitCode = status;
