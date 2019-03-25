
const shell = require('shelljs');
process.setMaxListeners(Infinity)

shell.exec('git reset --hard HEAD && git clean -f && git pull')

while (true) {
  shell.exec('npm run big')
}
