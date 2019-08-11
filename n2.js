process.setMaxListeners(0)

var shell = require('shelljs');

const arg = process.argv[2]
const nb = process.argv[3]
const check = process.env.CHECK

shell.exec('killall chrome', { silent: true })

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const pull = () => {
  shell.exec('npm run rm && npm run clear', { silent: true })
  shell.exec('git reset --hard origin/master', { silent: true })
  shell.exec('git pull', { silent: true })
}

process.on('SIGINT', () => {
  process.exit()
});

try {
  shell.exec('expressvpn disconnect', { silent: true })
}
catch (e) { }

const main = async () => {
  pull()

  let cmd = 'CLIENTID=' + arg + ' TIME=' + Date.now() + ' node runAccount'
  cmd = check ? 'CHECK=true ' + cmd : cmd

  shell.exec(cmd, async (code, b, c) => {
    // console.log(`${nb} code: ${code}`)
    if (code !== 100) {
      main()
    }
  })
}

for (let i = 0; i < 5; i++) {
  main()
}
