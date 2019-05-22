var shell = require('shelljs');

while (true) {
  shell.exec('killall chrome', { silent: true })
  shell.exec('npm run rm && npm run clear', { silent: true })
  shell.exec('git reset --hard origin/master')
  shell.exec('git pull')
  shell.exec('npm run xall')
}