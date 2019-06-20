var shell = require('shelljs');

const arg = process.argv[2]

shell.exec('killall chrome', { silent: true })

const pull = () => {
  shell.exec('npm run rm && npm run clear', { silent: true })
  shell.exec('git reset --hard origin/master', { silent: true })
  shell.exec('git pull', { silent: true })
}

pull()
const inter = setInterval(pull, 1000 * 60 * 2)

let out = 0
for (let i = 0; i < 13; i++) {
  shell.exec('node index ' + arg, () => {
    if (++out === 5) {
      clearInterval(inter)
      process.exit()
    }
  })
}

process.on('SIGINT', () => {
  clearInterval(inter)
  process.exit()
});
