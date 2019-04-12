var shell = require('shelljs');

while (true) {
  shell.exec('killall chrome', { silent: true })
  // shell.exec('git clean -fd && git reset --hard HEAD')
  shell.exec('free -m && sync')
  shell.exec('sudo npm run rmcache', { silent: true })
  shell.exec('free -m')
  shell.exec('git pull')
  shell.exec('npm run all')
}