var shell = require('shelljs');

while (true) {
  shell.exec('killall chrome', { silent: true })
  shell.exec('npm run rm', { silent: true })
  shell.exec('git clean -fd && git reset --hard origin/master')
  shell.exec('git pull')
  shell.exec('npm run big')
}