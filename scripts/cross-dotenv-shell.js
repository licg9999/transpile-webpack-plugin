const crossSpawn = require('cross-spawn');
const dotenv = require('dotenv');

const [, , argv0, ...args] = process.argv;

dotenv.config();

const evaluatedArgs = args.map((arg) => {
  if (!/^[A-Z0-9_]+$/.test(arg)) {
    return arg;
  }
  const envVal = process.env[arg];
  if (typeof envVal !== 'string') {
    return arg;
  }
  return envVal;
});

crossSpawn.sync(argv0, evaluatedArgs, { stdio: 'inherit' });
