process.setMaxListeners(0)

var fs = require('fs');
var shell = require('shelljs');
var socket = require('socket.io-client')('https://online-music.herokuapp.com');

const check = process.env.CHECK || process.env.TYPE
let accountsValid = 0
const max = process.env.BIG ? 63 : 7
let pause = false
let first = true
let updating
let timeout

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const getTime = () => {
  const date = new Date
  const hour = date.getUTCHours() + 1
  const minute = date.getUTCMinutes() < 10 ? '0' + date.getUTCMinutes() : date.getUTCMinutes()
  return hour + 'H' + minute
}

let clientId = Date.now()

const main = async () => {
  try {
    shell.exec('expressvpn disconnect', { silent: true })
  }
  catch (e) { }

  accountsValid++
  process.stdout.write(`${getTime()} max: ${accountsValid >= max} ${accountsValid} \r`)

  let cmd = 'CLIENTID=' + clientId + ' node runAccount'
  cmd = check ? 'CHECK=true ' + cmd : cmd

  shell.exec(cmd, async (code, b, c) => {
    accountsValid--

    process.stdout.write(`${getTime()} max: ${accountsValid >= max} ${accountsValid} \r`)

    if (code === 100) {
      console.log('exit')
      clearInterval(timeout)
      process.exit()
    }
  })
}

timeout = setInterval(() => {
  process.stdout.write(`${getTime()} max: ${accountsValid >= max} ${accountsValid} \r`)
  if (accountsValid < max) { main() }
}, check ? 1000 * 30 : 1000 * 30 + rand(1000 * 90));

process.on('SIGINT', () => {
  clearInterval(timeout)
  console.log('exit')
  process.exit()
});
