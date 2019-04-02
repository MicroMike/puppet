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
  return date.getUTCHours() + 1 + 'H' + date.getUTCMinutes()
}

const main = async (account) => {
  accountsValid.push(account)
  socket.emit('runOk', account)

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

process.on('SIGINT', (code) => {
  over = true
  socket.emit('exitScript', accountsValid)
  process.exit()
});

socket.on('activate', () => {
  socket.emit('ok', accountsValid)
})

socket.on('done', () => {
  socket.emit('getOne', process.env)
})

socket.on('run', account => {
  if (over) { return }
  if (account) { main(account) }
});

socket.on('next', () => {
  setTimeout(() => {
    if (over) { return }

    if (check || accountsValid.length < max) {
      socket.emit('getOne', process.env)
    }
  }, 1000 * pause);
})