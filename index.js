process.setMaxListeners(0)

var shell = require('shelljs');
var socket = require('socket.io-client')('https://online-music.herokuapp.com');

const check = process.env.CHECK || process.env.TYPE
let accounts = []
let accountsValid = []
let over = false
const max = process.env.BIG ? 60 : 20
const pause = process.env.BIG
  ? 20
  : check
    ? 5
    : 30

const getTime = () => {
  const date = new Date
  return date.getUTCHours() + 1 + 'H' + date.getUTCMinutes()
}

const main = async (account) => {
  if (over || accounts.length === 0) { return }
  if (!check && accountsValid >= max) { return }

  accountsValid.push(account)
  process.stdout.write(getTime() + " " + accountsValid.length + "\r");

  const cmd = check
    ? 'CHECK=' + check + ' ACCOUNT=' + account + ' node runAccount'
    : 'ACCOUNT=' + account + ' node runAccount'

  const accountInfo = account.split(':')
  const player = accountInfo[0]
  const login = accountInfo[1]

  shell.exec('find save/' + player + '_' + login + ' -type f ! -iname "Cookies" -delete', { silent: true })
  shell.exec(cmd, (code, b, c) => {
    if (!check) {
      accountsValid = accountsValid.filter(a => a !== account)
      // 4 = DEL
      if (code !== 4) {
        socket.emit('loop', account)
      }
    }

    if (code === 4) {
      socket.emit('delete', account)
    }

    process.stdout.write(getTime() + " " + accountsValid.length + "\r");
  })
}

process.on('SIGINT', function (code) {
  socket.emit('exitScript', accountsValid)
  over = true
});

socket.on('done', () => {
  socket.emit('getOne', process.env.RAND)

  const mainInter = setInterval(() => {
    if (over) { return clearInterval(mainInter) }
    socket.emit('getOne', process.env.RAND)
  }, 1000 * pause);
})

socket.on('run', account => {
  main(account)
});