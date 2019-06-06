process.setMaxListeners(0)

var fs = require('fs');
var shell = require('shelljs');
var socket = require('socket.io-client')('https://online-music.herokuapp.com');
let clientId = Date.now()

const check = process.env.CHECK || process.env.TYPE
let accountsValid = 0
const max = process.env.BIG ? 63 : 21
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

const main = async (account, isCheck) => {
  try {
    shell.exec('expressvpn disconnect', { silent: true })
  }
  catch (e) { }

  accountsValid++
  process.stdout.write(getTime() + " " + accountsValid + "\r");

  let cmd = 'CLIENTID=' + clientId + ' RAND=TRUE MAX=' + max + ' PLAYS=' + accountsValid + ' node runAccount'
  cmd = check || isCheck ? 'CHECK=true ' + cmd : cmd

  shell.exec(cmd, async (code, b, c) => {
    accountsValid = accountsValid.filter(a => a !== account)
    process.stdout.write(getTime() + " " + accountsValid + "\r");

    if (code === 100 && accountsValid === 0) {
      console.log('exit')
      clearTimeout(timeout)
      process.exit()
    }
  })

  timeout = setTimeout(() => {
    if (accountsValid < max) { main() }
  }, check ? 1000 * 30 : 1000 * 30 + rand(1000 * 90));
}

main()

process.on('SIGINT', () => {
  clearTimeout(timeout)
  console.log('exit')
  // socket.emit('Cdisconnect')
  process.exit()
});

// socket.on('restart', () => {
//   console.log('reset')
//   // socket.emit('Cdisconnect')
//   process.exit()
// });

// socket.on('activate', (id) => {
//   if (!clientId) { clientId = id }
//   fs.readFile('napsterAccountDel.txt', 'utf8', async (err, del) => {
//     if (err) return console.log(err);
//     socket.emit('ok', { accountsValid, max, env: process.env, del, first, id: clientId, check })
//     first = false
//   })
// })

// socket.on('run', account => {
//   main(account, check)
// });

// socket.on('goPlay', () => {
//   socket.emit('play', accountsValid)
// });
