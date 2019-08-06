var shell = require('shelljs');

const arg = process.argv[2]

shell.exec('killall chrome', { silent: true })

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const pull = () => {
  shell.exec('npm run rm && npm run clear', { silent: true })
  shell.exec('git reset --hard origin/master', { silent: true })
  shell.exec('git pull', { silent: true })
}

const inter = setInterval(pull, 1000 * 60 * 2)

let out = 0
let up = 60
let count = 0
let timeout = []

const run = async (i) => {
  shell.exec('node index ' + arg + ' ' + i, code => {
    if (code === 100) {
      timeout.forEach(i => {
        clearTimeout(i)
      });
      clearInterval(inter)
      process.exit()
    }
    else {
      run(i)
    }
  })
}

for (let i = 0; i < 50; i++) {
  timeout.push(
    setTimeout(() => {
      run(i)
    }, rand(1000 * 60 * 25))
  )
}

process.on('SIGINT', () => {
  timeout.forEach(i => {
    clearTimeout(i)
  });
  clearInterval(inter)
  process.exit()
});
