process.setMaxListeners(Infinity)

const shell = require('shelljs');
// const sockets = []

const arg = process.argv[2]
const nb = process.argv[3]
const thread = process.argv[4]

let close = false

process.on('SIGINT', () => {
  close = true
  console.log('----- END -----')
  // sockets.forEach(s => s && s.disconnect())
  shell.exec('killall node', { silent: true })
  process.exit()
})

const fct = async (i) => {
  while (true) {
    if (close) { break }
    console.log('----- START ' + i + ' ----- ')

    // const socket = require('socket.io-client')('https://online-music.herokuapp.com', { transports: ['websocket'] });
    // sockets[i] = socket

    try {
      const b = shell.exec('git fetch && git status', { silent: true })
      if (!b.match(/up to date/g)) {
        shell.exec('npm run rm && npm run clear', { silent: true })
        shell.exec('git reset --hard origin/master', { silent: true })
        shell.exec('git pull', { silent: true })
      }
    }
    catch (e) { }

    // const start = require('./new')
    // await start(socket, arg, nb, i)
    // socket.disconnect()
    // sockets[i] = null

    shell.exec('xvfb-run -a node --max-old-space-size=12288 new ' + arg + ' ' + nb + ' ' + thread)
  }
}

shell.exec('killall chrome', { silent: true })

for (let i = 1; i <= thread; i++) {
  fct(i)
}