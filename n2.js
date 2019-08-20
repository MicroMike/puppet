process.setMaxListeners(Infinity)

var shell = require('shelljs');

const arg = process.argv[2]
const check = process.env.CHECK

shell.exec('killall chrome', { silent: true })

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const pull = () => {
  try {
    shell.exec('git fetch && git status', { silent: true }, (a, b, c) => {
      console.log(b)
      shell.exec('npm run rm && npm run clear', { silent: true })
      shell.exec('git reset --hard origin/master', { silent: true })
      shell.exec('git pull', { silent: true })
    })
  }
  catch (e) { }
}

let out = false
process.on('SIGINT', () => {
  out = true
  process.exit()
});

try {
  shell.exec('expressvpn disconnect', { silent: true })
}
catch (e) { }

const main = async (wait = false) => {
  if (out) { return }

  pull()

  let cmd = 'WAIT=' + wait + ' CLIENTID=' + arg + ' TIME=' + Date.now() + ' node runAccount'
  cmd = check ? 'CHECK=true ' + cmd : cmd

  shell.exec(cmd, async (code, b, c) => {
    // console.log(`code: ${code}`, b, c)
    main()
  })
}

for (let i = 0; i < 60; i++) {
  main(true)
}
