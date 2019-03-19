
const shell = require('shelljs');

shell.exec('git reset --hard HEAD && git clean -f && git pull')

while (true) {
  shell.exec('npm run big')
}
