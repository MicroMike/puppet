process.setMaxListeners(Infinity)

const shell = require('shelljs');
// const sockets = []

const arg = process.argv[2]
const nb = Number(process.argv[3]) || 1
const thread = Number(process.argv[4]) || 1

let close = false

process.on('SIGINT', () => {
  close = true
  console.log('----- END -----')
  shell.exec('killall node', { silent: true })
  process.exit()
})

const fct = async (i) => {
  if (close) { return }

  try {
    const b = shell.exec('git fetch && git status', { silent: true })
    if (!b.match(/up to date/g)) {
      console.log('----- PULL ' + thread + ' -----')
      shell.exec('npm run rm && npm run clear', { silent: true })
      shell.exec('git reset --hard origin/master', { silent: true })
      shell.exec('git pull', { silent: true })
    }
  }
  catch (e) { }

  console.log('----- START ' + i + ' ----- ')

  const ram = shell.exec('free -m |awk \'{ print $2 }\' | awk \'NR == 2\'', { silent: true }).stdout.trim()
  shell.exec('xvfb-run -a node --max-old-space-size=' + ram + ' new ' + arg + ' ' + nb + ' ' + i, () => {
    try {
      const b = shell.exec('git fetch && git status', { silent: true })
      if (!b.match(/up to date/g)) {
        console.log('----- PULL ' + thread + ' -----')
        shell.exec('npm run rm && npm run clear', { silent: true })
        shell.exec('git reset --hard origin/master', { silent: true })
        shell.exec('git pull', { silent: true })
      }
    }
    catch (e) { }

    setTimeout(() => {
      fct(i)
    }, 1000 * 3);
  })
}

shell.exec('killall chrome', { silent: true })

for (let i = 1; i <= thread; i++) {
  fct(i)
}