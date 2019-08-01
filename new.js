process.setMaxListeners(0)

const shell = require('shelljs');

const arg = process.argv[2]
const nb = process.argv[3]

shell.exec('killall chrome', { silent: true })

const check = process.env.CHECK || process.env.TYPE
let accountsValid = 0
const max = process.env.BIG ? 63 : 1
let pause = false
let first = true
let updating
let timeout
let time
let port = 9222

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const getTime = () => {
  const date = new Date
  const hour = date.getUTCHours() + 1
  const minute = date.getUTCMinutes() < 10 ? '0' + date.getUTCMinutes() : date.getUTCMinutes()
  return hour + 'H' + minute
}

const pull = () => {
  shell.exec('npm run rm && npm run clear', { silent: true })
  shell.exec('git reset --hard origin/master', { silent: true })
  shell.exec('git pull', { silent: true })
}

pull()
const inter = setInterval(pull, 1000 * 60 * 2)

const run = async (i) => {
  try {
    shell.exec('expressvpn disconnect', { silent: true })
  }
  catch (e) { }

  accountsValid++
  // process.stdout.write(`${getTime()} max: ${accountsValid >= max} ${accountsValid} \r`)
  // console.log(`${nb} ${getTime()} max: ${accountsValid >= max} ${accountsValid}`)

  let cmd = 'PORT=' + port + ' CLIENTID=' + arg + ' TIME=' + time + ' node runAccount'
  cmd = check ? 'CHECK=true ' + cmd : cmd
  cmd = first ? 'FIRST=true ' + cmd : cmd
  first = false

  if (port++ > 9500) {
    port = 9222
  }

  shell.exec(cmd, async (code, b, c) => {
    accountsValid--
    console.log(`${nb} code: ${code}`)
    // process.stdout.write(`${getTime()} max: ${accountsValid >= max} ${accountsValid} \r`)

    if (code === 100) {
      console.log('exit')
      process.exit()
    }
    else {
      run(i)
    }
  })
}

for (let i = 0; i < 3; i++) {
  run(i)
}

process.on('SIGINT', () => {
  clearInterval(inter)
  process.exit()
});
