var shell = require('shelljs');

while (true) {
  shell.exec('killall chrome', { silent: true })
  shell.exec('git pull')
  shell.exec('npm run all')
}