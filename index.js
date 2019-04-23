process.setMaxListeners(0)

var fs = require('fs');
var shell = require('shelljs');
var socket = require('socket.io-client')('https://online-music.herokuapp.com');
let clientId

const check = process.env.CHECK || process.env.TYPE
let accountsValid = []
const max = process.env.BIG ? 40 : 20
let pause = false
let first = true

const getTime = () => {
  const date = new Date
  const hour = date.getUTCHours() + 1
  const minute = date.getUTCMinutes() < 10 ? '0' + date.getUTCMinutes() : date.getUTCMinutes()
  return hour + 'H' + minute
}

const main = async (account, isCheck) => {
  accountsValid.push(account)
  process.stdout.write(getTime() + " " + accountsValid.length + "\r");

  let cmd = 'ACCOUNT=' + account + ' node runAccount'
  cmd = check || isCheck ? 'CHECK=true ' + cmd : cmd
  cmd = clientId ? 'CLIENTID=' + clientId + ' ' + cmd : cmd

  const accountInfo = account.split(':')
  const player = accountInfo[0]
  const login = accountInfo[1]

  // shell.exec('find save/' + player + '_' + login + ' -type f ! -iname "Cookies" -delete', { silent: true })
  shell.exec(cmd, async (code, b, c) => {
    accountsValid = accountsValid.filter(a => a !== account)

    let errorMsg = 'Other'
    errorMsg = code === 0 ? 'KO' : errorMsg
    errorMsg = code === 1 ? 'Loop' : errorMsg
    errorMsg = code === 11 ? 'Used' : errorMsg

    if (code === 4) {
      // 4 = DEL
      socket.emit('delete', account)

      fs.readFile('napsterAccountDel.txt', 'utf8', function (err, data) {
        if (err) return console.log(err);
        data = data.split(',').filter(e => e)
        if (data.indexOf(account) < 0) { data.push(account) }
        fs.writeFile('napsterAccountDel.txt', data.length === 1 ? data[0] : data.join(','), function (err) {
          if (err) return console.log(err);
        });
      });
    }
    else if (code === 5) {
      // 5 = RETRY
      main(account)
    }
    else {
      socket.emit('loop', { errorMsg, account })
    }

    process.stdout.write(getTime() + " " + accountsValid.length + "\r");
  })
}

process.on('SIGINT', () => {
  socket.emit('Cdisconnect', accountsValid)
  process.exit()
});

socket.on('activate', (id) => {
  if (!clientId) { clientId = id }
  fs.readFile('napsterAccountDel.txt', 'utf8', async (err, del) => {
    if (err) return console.log(err);
    socket.emit('ok', { accountsValid, max, env: process.env, del, first, id: clientId })
    first = false
  })
})

socket.on('run', account => {
  main(account)
});

socket.on('runCheck', account => {
  main(account, true)
});

socket.on('goPlay', () => {
  socket.emit('play', accountsValid)
});

socket.on('restartClient', () => {
  console.log('reset')
  socket.emit('Cdisconnect', accountsValid)
  process.exit()
});
