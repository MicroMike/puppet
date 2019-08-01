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
let count = 0
let inter = []

const run = async (i) => {
  shell.exec('node index ' + arg + ' ' + i, code => {
    if (code === 100) {
      inter.forEach(i => {
        clearTimeout(i)
      });
      process.exit()
    }
    else if (code !== 10) {
      run(i)
    }
  })
}

for (let i = 0; i < 50; i++) {
  inter.push(
    setTimeout(() => {
      run(i)
    }, rand(1000 * 60 * 5))
  )
}

process.on('SIGINT', () => {
  inter.forEach(i => {
    clearTimeout(i)
  });
  process.exit()
});
