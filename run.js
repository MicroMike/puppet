var shell = require('shelljs');

shell.exec('git pull')

while (true) {
  shell.exec('npm run all')
}