process.setMaxListeners(0)

const fs = require('fs');
var shell = require('shelljs');
var socket = require('socket.io-client')('https://online-music.herokuapp.com');

const check = process.env.CHECK || process.env.TYPE
let accounts = []
let accountsValid = 0
let over = false
const max = process.env.BIG ? 60 : 20
const pause = process.env.BIG
  ? 20
  : check
    ? 5
    : 30
let errorPath = false
let stop = false

const getTime = () => {
  const date = new Date
  return date.getUTCHours() + 1 + 'H' + date.getUTCMinutes()
}

const main = async () => {
  if (over || accounts.length === 0) { return }
  if (!check && accountsValid >= max) { return }

  let account = accounts.shift()
  if (!account) { return }

  socket.emit('usedAccount', account)

  accountsValid++
  process.stdout.write(getTime() + " " + accountsValid + "\r");

  const cmd = check
    ? 'CHECK=' + check + ' ACCOUNT=' + account + ' node runAccount'
    : 'ACCOUNT=' + account + ' node runAccount'

  const accountInfo = account.split(':')
  const player = accountInfo[0]
  const login = accountInfo[1]

  shell.exec('find save/' + player + '_' + login + ' -type f ! -iname "Cookies" -delete')
  shell.exec(cmd, (code, b, c) => {
    if (!check) {
      accountsValid--
      // 4 = DEL
      if (code !== 4) {
        socket.emit('unusedAccount', account)
      }
    }

    if (code === 4) {
      socket.emit('delete', account)
    }

    process.stdout.write(getTime() + " " + accountsValid + "\r");
  })
}

process.on('SIGINT', function (code) {
  over = true
});

socket.on('done', () => {
  socket.emit('getAccounts')
})

socket.on('accounts', data => {
  accounts = data

  const mainInter = setInterval(() => {
    if (over || errorPath) { return clearInterval(mainInter) }
    if (!stop) {
      main()
    }
  }, 1000 * pause);

  main()
});

socket.on('updateAccounts', data => {
  accounts = data
})