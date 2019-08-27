process.setMaxListeners(Infinity)

var shell = require('shelljs');
var socket = require('socket.io-client')('https://online-music.herokuapp.com');

const arg = process.argv[2]
const nb = process.argv[3]
const check = process.env.CHECK


let parentId
socket.on('activate', id => {
  socket.emit('parent', { connected: parentId, id: arg })
  if (!parentId) { parentId = id }
})

socket.on('run', () => {
  main()
})

shell.exec('killall chrome', { silent: true })

let out = false
process.on('SIGINT', () => {
  out = true
  process.exit()
});

try {
  shell.exec('expressvpn disconnect', { silent: true })
}
catch (e) { }

let count = 0

const main = async (needWait = false) => {
  if (out) { return }

  try {
    const b = shell.exec('git fetch && git status', { silent: true })
    if (!b.match(/up to date/g)) {
      shell.exec('npm run rm && npm run clear', { silent: true })
      shell.exec('git reset --hard origin/master', { silent: true })
      shell.exec('git pull', { silent: true })
    }
  }
  catch (e) { }

  let cmd = 'CLIENTID=' + arg + ' TIME=' + Date.now() + ' node runAccount'
  cmd = check ? 'CHECK=true ' + cmd : cmd
  // cmd = needWait ? 'WAIT=true ' + cmd : cmd

  if (count < (nb || 20)) {
    count++
    shell.exec(cmd, async (code, b, c) => {
      // console.log(`code: ${code}`, b, c)
      count--
      main()
    })
  }
}
