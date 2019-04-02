process.setMaxListeners(0)

var shell = require('shelljs');
var socket = require('socket.io-client')('https://online-music.herokuapp.com');
var stdin = process.stdin;

// without this, we would only get streams once enter is pressed
// stdin.setRawMode(true);

// resume stdin in the parent process (node app won't quit all by itself
// unless an error or process.exit() happens)
stdin.resume();

// i don't want binary, do you?
stdin.setEncoding('utf8');

// on any data into stdin
stdin.on('data', function (key) {
  // ctrl-c ( end of text )
  if (key === '\u0003') {
    process.exit();
  }
  // write the key to stdout all normal like
  process.stdout.write(key);
});

const check = process.env.CHECK || process.env.TYPE
let accountsValid = []
let over = false
const max = process.env.BIG ? 60 : 25
const pause = check ? 5 : 13

const getTime = () => {
  const date = new Date
  return date.getUTCHours() + 1 + 'H' + date.getUTCMinutes()
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
      socket.emit('delete', account)
    }
    else if (!check) {
      socket.emit('loop', account)
    }

    process.stdout.write(getTime() + " " + accountsValid.length + "\r");
  })
}

process.on('SIGINT', function (code) {
  if (!check) {
    socket.emit('exitScript', accountsValid)
  }
  over = true
});

let scriptId

socket.on('activate', id => {
  scriptId = id
  socket.emit('ok', accountsValid)
})

socket.on('done', () => {
  socket.emit('getOne', process.env)
})

socket.on('run', account => {
  if (over) { return }

  if (account) { main(account) }

  setTimeout(() => {
    if (!check && accountsValid.length >= max) {
      socket.emit('getOne', process.env)
    }
  }, 1000 * pause);
});