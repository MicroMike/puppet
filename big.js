var shell = require('shelljs');

const arg = process.argv[2]

for (let i = 0; i < 13; i++) {
  shell.exec('node index ' + arg, () => { })
}

const inter = setInterval(() => {
  shell.exec('npm run rm && npm run clear', { silent: true })
  shell.exec('git reset --hard origin/master', { silent: true })
  shell.exec('git pull', { silent: true })
}, 1000 * 60 * 2)

process.on('SIGINT', () => {
  clearInterval(inter)
  process.exit()
});