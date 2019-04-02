process.setMaxListeners(0)

var shell = require('shelljs');
var socket = require('socket.io-client')('https://online-music.herokuapp.com');
let over = false

const check = process.env.CHECK || process.env.TYPE
let accountsValid = []
const max = process.env.BIG ? 60 : 25
const pause = check ? 10 : 30

const getTime = () => {
  const date = new Date
  const hour = date.getUTCHours() + 1
  const minute = date.getUTCMinutes() < 10 ? '0' + date.getUTCMinutes() : date.getUTCMinutes()
  return hour + 'H' + minute
}

const main = async (account) => {

  process.stdout.write(getTime() + " " + accountsValid.length + "\r");

  const cmd = check
    ? 'CHECK=' + check + ' ACCOUNT=' + account + ' node runAccount'
    : 'ACCOUNT=' + account + ' node runAccount'

  const accountInfo = account.split(':')
  const player = accountInfo[0]
  const login = accountInfo[1]

  shell.exec('find save/' + player + '_' + login + ' -type f ! -iname "Cookies" -delete', { silent: true })
  shell.exec(cmd, (code, b, c) => {
    if (over) { return }

    accountsValid = accountsValid.filter(a => a !== account)
    // 4 = DEL
    if (code === 4) {
      socket.emit('delete', account)
    }
    else if (!check) {
      socket.emit('loop', account)
    }

    process.stdout.write(getTime() + " " + accountsValid.length + "\r");
  })
}

const inter = () => {
  if (over) { return }

  if (check || accountsValid.length < max) {
    socket.emit('getOne', process.env)
  }

  setTimeout(() => {
    inter()
  }, 1000 * pause);
}

process.on('SIGINT', () => {
  over = true
  socket.emit('exitScript', accountsValid)
  setTimeout(() => {
    process.exit()
  }, 0);
});

socket.on('activate', () => {
  socket.emit('ok', accountsValid)
})

socket.on('done', () => {
  socket.emit('getOne', process.env)
  inter()
})

socket.on('run', account => {
  if (over) { return }
  if (account) {
    accountsValid.push(account)
    socket.emit('runOk', account)
    main(account)
  }
});
