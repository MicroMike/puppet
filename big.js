var shell = require('shelljs');

while (true) {
  shell.exec('killall chrome', { silent: true })
  shell.exec('npm run rm && npm run clear', { silent: true })
  shell.exec('git reset --hard origin/master')
  shell.exec('git pull')

  const one = shell.exec('npm run all', () => { })
  one.stdout.on('data', data => console.log(data))
  const two = shell.exec('npm run all', () => { })
  two.stdout.on('data', data => console.log(data))

  shell.exec('npm run all')
}