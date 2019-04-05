process.setMaxListeners(0)

var fs = require('fs');
var shell = require('shelljs');
var socket = require('socket.io-client')('https://online-music.herokuapp.com');

const check = process.env.CHECK || process.env.TYPE
let accountsValid = []
const max = process.env.BIG ? 60 : 23
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
  shell.exec(cmd, (code, b, c) => {
    accountsValid = accountsValid.filter(a => a !== account)
    // 4 = DEL
    if (code === 4) {
      fs.readFile('napsterAccountDel.txt', 'utf8', function (err, data) {
        if (err) return console.log(err);
        data = data.split(',').filter(e => e)
        data = data.filter(a => a !== account)
        data.push(account)
        fs.writeFile('napsterAccountDel.txt', data.length === 1 ? data[0] : data.join(','), function (err) {
          if (err) return console.log(err);
        });
      });

      socket.emit('delete', account)
    }
    else if (!check) {
      socket.emit('loop', account)
    }

    process.stdout.write(getTime() + " " + accountsValid.length + "\r");
  })
}

process.on('SIGINT', () => {
  process.exit()
});

socket.on('start', () => {
  socket.emit('started')
})

socket.on('activate', () => {
  fs.readFile('napsterAccountDel.txt', 'utf8', async (err, del) => {
    if (err) return console.log(err);
    socket.emit('ok', { accountsValid, max, env: process.env, del })
  })
})

socket.on('run', account => {
  main(account)
});

socket.on('reset', () => {
  socket.emit('disconnect')
  process.exit()
});
