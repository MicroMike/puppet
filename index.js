process.setMaxListeners(0)

var fs = require('fs');
var shell = require('shelljs');
var socket = require('socket.io-client')('https://online-music.herokuapp.com');
const image2base64 = require('image-to-base64');

const check = process.env.CHECK || process.env.TYPE
let accountsValid = []
const max = process.env.TYPE ? 3 : 20
const pause = check ? 10 : 30

const getTime = () => {
  const date = new Date
  const hour = date.getUTCHours() + 1
  const minute = date.getUTCMinutes() < 10 ? '0' + date.getUTCMinutes() : date.getUTCMinutes()
  return hour + 'H' + minute
}

const main = async (account) => {
  accountsValid.push(account)
  process.stdout.write(getTime() + " " + accountsValid.length + "\r");

  const cmd = check
    ? 'CHECK=' + check + ' ACCOUNT=' + account + ' node runAccount'
    : 'ACCOUNT=' + account + ' node runAccount'

  const accountInfo = account.split(':')
  const player = accountInfo[0]
  const login = accountInfo[1]

  shell.exec('find save/' + player + '_' + login + ' -type f ! -iname "Cookies" -delete', { silent: true })
  shell.exec(cmd, async (code, b, c) => {
    accountsValid = accountsValid.filter(a => a !== account)

    try {
      const img = await image2base64(login + '_screenshot.png')
      if (img) {
        socket.emit('screen', { img, login, player })
      }
    }
    catch (e) { }

    // 4 = DEL
    if (code === 4) {
      socket.emit('delete', account)
    }
    else {
      socket.emit('loop', account)
    }

    process.stdout.write(getTime() + " " + accountsValid.length + "\r");
  })
}

process.on('SIGINT', () => {
  process.exit()
});

socket.on('activate', () => {
  fs.readFile('napsterAccountDel.txt', 'utf8', async (err, del) => {
    if (err) return console.log(err);
    socket.emit('ok', { accountsValid, max, env: process.env, del, pause: 1000 * pause })
  })
})

socket.on('run', account => {
  main(account)
});

socket.on('reStart', () => {
  console.log('reset')
  socket.emit('disconnect')
  process.exit()
});
