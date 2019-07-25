process.setMaxListeners(0)
const arg = process.argv[2]
const type = process.argv[3]

var shell = require('shelljs');
// var fs = require('fs');
// var socket = require('socket.io-client')('https://online-music.herokuapp.com');

const check = process.env.CHECK || process.env.TYPE
let accountsValid = 0
const max = process.env.BIG ? 63 : 5
let pause = false
let first = true
let updating
let timeout
let time

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const getTime = () => {
  const date = new Date
  const hour = date.getUTCHours() + 1
  const minute = date.getUTCMinutes() < 10 ? '0' + date.getUTCMinutes() : date.getUTCMinutes()
  return hour + 'H' + minute
}

const main = async () => {
  try {
    shell.exec('expressvpn disconnect', { silent: true })
  }
  catch (e) { }

  accountsValid++
  process.stdout.write(`${getTime()} max: ${accountsValid >= max} ${accountsValid} \r`)

  let cmd = 'CLIENTID=' + arg + ' TIME=' + time + ' node runAccount'
  cmd = check ? 'CHECK=true ' + cmd : cmd
  cmd = first ? 'FIRST=true ' + cmd : cmd
  cmd = type ? `TYPE=${type} ` + cmd : cmd
  first = false

  shell.exec(cmd, async (code, b, c) => {
    accountsValid--
    console.log(code)
    process.stdout.write(`${getTime()} max: ${accountsValid >= max} ${accountsValid} \r`)

    if (code === 100) {
      console.log('exit')
      clearInterval(timeout)
      process.exit()
    }

    if (code === 1234) {
      main()
    }
  })
}

if (check || type) { main() }

timeout = setInterval(() => {
  time = time || Date.now()

  process.stdout.write(`${getTime()} max: ${accountsValid >= max} ${accountsValid} \r`)
  if (check || accountsValid < max) { main() }
}, check || type ? 1000 * 60 : 1000 * 60 + rand(1000 * 120));

process.on('SIGINT', () => {
  clearInterval(timeout)
  console.log('exit')
  process.exit()
});
