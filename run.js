var shell = require('shelljs');

const arg = process.argv[2]

shell.exec('killall chrome', { silent: true })
shell.exec('npm run rm && npm run clear', { silent: true })
shell.exec('git reset --hard origin/master')
shell.exec('git pull')

for (let i = 0; i < 5; i++) {
  shell.exec('node index ' + arg, () => { })
}

const inter = setInterval(() => {
  shell.exec('git pull', { silent: true })
}, 1000 * 60)

process.on('SIGINT', () => {
  clearInterval(inter)
  process.exit()
});