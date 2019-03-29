process.setMaxListeners(0)

const fs = require('fs');
const shell = require('shelljs');
const io = require('socket.io-client');
const socket = io('https://online-music.herokuapp.com/');

const check = process.env.CHECK || process.env.TYPE
let accounts = []
let accountsValid = 0
let over = false
const max = process.env.BIG ? 80 : 20
const pause = process.env.BIG
  ? 10
  : check
    ? 5
    : 30
let errorPath = false
let stop = false

const getTime = () => {
  const date = new Date
  return date.getUTCHours() + 1 + 'H' + date.getUTCMinutes() + ' '
}

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

function shuffle(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr.sort(() => { return rand(2) })
  }
  return arr
}

const main = async () => {
  if (over || accounts.length === 0) { return }
  if (!check && accountsValid >= max) { return }

  let account = accounts.shift()
  if (!account) { return }

  accountsValid++
  process.stdout.write(getTime() + " " + accountsValid + "\r");

  socket.emit('update', {
    account,
    accountsValid: accountsValid,
    time: getTime()
  })

  const cmd = check
    ? 'CHECK=' + check + ' ACCOUNT=' + account + ' node runAccount'
    : 'ACCOUNT=' + account + ' node runAccount'

  shell.exec(cmd, (code, b, c) => {
    if (!check) {
      accountsValid--
      // 4 = DEL
      if (code !== 4) {
        accounts.push(account)
      }
    }
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
    }
    process.stdout.write(getTime() + " " + accountsValid + "\r");
  })
}

const mainInter = setInterval(() => {
  if (over || errorPath) { return clearInterval(mainInter) }
  if (!stop) {
    main()
  }
}, 1000 * pause);

let file = process.env.FILE || 'napsterAccount.txt'

fs.readFile(file, 'utf8', async (err, data) => {
  if (err) return console.log(err);

  fs.readFile('napsterAccountDel.txt', 'utf8', async (err2, dataDel) => {
    if (err2) return console.log(err2);

    accounts = data.split(',')

    dataDel = dataDel.split(',').filter(e => e)
    accounts = accounts.filter(e => dataDel.indexOf(e) < 0)

    if (process.env.TYPE) {
      accounts = accounts.filter(m => m.split(':')[0] === process.env.TYPE)
    }

    accounts = process.env.RAND ? shuffle(accounts) : accounts
    console.log(accounts.length)
    // shell.exec('find save/ -type f ! -iname "Cookies" -delete')
    main()
  })
});

process.on('SIGINT', function (code) {
  over = true
});
