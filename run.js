
const shell = require('shelljs');

while (true) {
  shell.exec('git reset --hard && git clean -f && git pull && npm run all')
}
