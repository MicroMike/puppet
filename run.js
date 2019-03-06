
const shell = require('shelljs');

shell.exec('git reset --hard && git clean -f && git pull')

while (true) {
  shell.exec('npm run all')
}
