const fs = require('fs');
const request = require('ajax-request');
const runAccount = require('./runAccount')
var shell = require('shelljs');

process.setMaxListeners(Infinity)

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

  let account = accounts[0]
  if (!account) { return }

  accountsValid++
  console.log(account)
  const log = shell.exec('ACCOUNT=' + account + ' node runAccount')
}

const mainInter = setInterval(() => {
  if (over || errorPath) { return clearInterval(mainInter) }
  if (!stop) {
    main()
  }
  process.stdout.write(getTime() + " " + accountsValid + "\r");
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
    main()
  })
});

process.on('SIGINT', function (code) {
  over = true
});
