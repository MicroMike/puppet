process.setMaxListeners(0)

var fs = require('fs');
var shell = require('shelljs');
var socket = require('socket.io-client')('https://online-music.herokuapp.com');
let clientId

const check = process.env.CHECK || process.env.TYPE
let accountsValid = []
const max = process.env.BIG ? 40 : 20
const pause = check ? 10 : 60

const getTime = () => {
  const date = new Date
  const hour = date.getUTCHours() + 1
  const minute = date.getUTCMinutes() < 10 ? '0' + date.getUTCMinutes() : date.getUTCMinutes()
  return hour + 'H' + minute
}

const main = async (account) => {
  accountsValid.push(account)
  process.stdout.write(getTime() + " " + accountsValid.length + "\r");

  let cmd = 'ACCOUNT=' + account + ' node runAccount'
  cmd = check ? 'CHECK=' + check + ' ' + cmd : cmd
  cmd = clientId ? 'CLIENTID=' + clientId + ' ' + cmd : cmd

  const accountInfo = account.split(':')
  const player = accountInfo[0]
  const login = accountInfo[1]

  shell.exec('find save/' + player + '_' + login + ' -type f ! -iname "Cookies" -delete', { silent: true })
  shell.exec(cmd, async (code, b, c) => {
    accountsValid = accountsValid.filter(a => a !== account)

    let errorMsg = 'Loop'

    errorMsg = code === 2 ? 'First play' : errorMsg
    errorMsg = code === 3 ? 'Loop play' : errorMsg
    errorMsg = code === 4 ? 'Del' : errorMsg
    errorMsg = code === 5 ? 'Retry' : errorMsg
    errorMsg = code === 6 ? 'Tidal' : errorMsg
    errorMsg = code === 7 ? 'FillForm' : errorMsg
    errorMsg = code === 8 ? 'Login' : errorMsg
    errorMsg = code === 9 ? 'No bar' : errorMsg

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

    try {
      const img = await image2base64(login + '_screenshot.png')
      if (img && code !== 1) {
        socket.emit('screen', { img, log: account + ' => ' + errorMsg })
      }
    }
    catch (e) { }

    process.stdout.write(getTime() + " " + accountsValid.length + "\r");
  })
}

process.on('SIGINT', () => {
  process.exit()
});

socket.on('activate', (id) => {
  clientId = id
  fs.readFile('napsterAccountDel.txt', 'utf8', async (err, del) => {
    if (err) return console.log(err);
    socket.emit('ok', { accountsValid, max, env: process.env, del })
  })
})

socket.on('run', account => {
  main(account)
});

socket.on('goPlay', () => {
  socket.emit('play')
});

socket.on('reStart', () => {
  console.log('reset')
  socket.emit('disconnect')
  process.exit()
});
