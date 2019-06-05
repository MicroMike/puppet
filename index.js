process.setMaxListeners(0)

var fs = require('fs');
var shell = require('shelljs');
var socket = require('socket.io-client')('https://online-music.herokuapp.com');
let clientId

const check = process.env.CHECK || process.env.TYPE
let accountsValid = []
const max = process.env.BIG ? 60 : 6
let pause = false
let first = true
let updating

const getTime = () => {
  const date = new Date
  const hour = date.getUTCHours() + 1
  const minute = date.getUTCMinutes() < 10 ? '0' + date.getUTCMinutes() : date.getUTCMinutes()
  return hour + 'H' + minute
}

const main = async (account, isCheck) => {
  shell.exec('expressvpn disconnect', { silent: true })

  if (!check && !updating) {
    updating = true
    shell.exec('npm run rm', { silent: true })
    shell.exec('npm run clear', { silent: true })
    shell.exec('git reset --hard origin/master', { silent: true })
    shell.exec('git pull', { silent: true })

    setTimeout(() => {
      updating = false
    }, 1000 * 60);
  }

  accountsValid.push(account)
  process.stdout.write(getTime() + " " + accountsValid.length + "\r");

  let cmd = 'ACCOUNT=' + account + ' node runAccount'
  cmd = check || isCheck ? 'CHECK=true ' + cmd : cmd
  cmd = clientId ? 'CLIENTID=' + clientId + ' ' + cmd : cmd

  shell.exec(cmd, async (code, b, c) => {
    accountsValid = accountsValid.filter(a => a !== account)
    process.stdout.write(getTime() + " " + accountsValid.length + "  \r");
  })
}

process.on('SIGINT', () => {
  console.log('exit')
  socket.emit('Cdisconnect')
  process.exit()
});

socket.on('restart', () => {
  console.log('reset')
  socket.emit('Cdisconnect')
  process.exit()
});

socket.on('activate', (id) => {
  if (!clientId) { clientId = id }
  fs.readFile('napsterAccountDel.txt', 'utf8', async (err, del) => {
    if (err) return console.log(err);
    socket.emit('ok', { accountsValid, max, env: process.env, del, first, id: clientId, check })
    first = false
  })
})

socket.on('run', account => {
  main(account, check)
});

socket.on('goPlay', () => {
  socket.emit('play', accountsValid)
});
