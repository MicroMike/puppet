var shell = require('shelljs');

while (true) {
  shell.exec('xvfb-run -a node new ' + process.argv[2])

  console.log('RESTART')

  shell.exec('npm run rm && npm run clear', { silent: true })
  shell.exec('git reset --hard origin/master', { silent: true })
  shell.exec('git pull', { silent: true })
}