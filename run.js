var shell = require('shelljs');

shell.exec('git pull')

while (true) {
  shell.exec('killall chrome && npm run all')
}