var shell = require('shelljs');

shell.exec('killall chrome', { silent: true })
shell.exec('npm run rm && npm run clear', { silent: true })
shell.exec('git reset --hard origin/master')
shell.exec('git pull')

while (true) {
  shell.exec('xvfb-run -a node run ' + process.argv[2])
}