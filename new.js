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
let up = 60

const run = async (i) => {
  shell.exec('node index ' + arg + ' ' + i, code => {
    if (code === 10) {
      clearInterval(inter)
      process.exit()
    }
    else {
      run(i)
    }
  })
}

for (let i = 0; i < 60; i++) {
  run(i)
}

process.on('SIGINT', () => {
  clearInterval(inter)
  process.exit()
});
