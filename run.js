var shell = require('shelljs');

shell.exec('git pull')

while (true) {
  shell.exec('killall chrome', { silent: true })
  shell.exec('npm run all')
}