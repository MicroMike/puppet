var shell = require('shelljs');

shell.exec('killall chrome', { silent: true })
shell.exec('npm run rm && npm run clear', { silent: true })
shell.exec('git reset --hard origin/master')
shell.exec('clear', { silent: true })
shell.exec('git pull')
// shell.exec('npm run all', () => { })
// shell.exec('npm run all', () => { })
shell.exec('npm run all')