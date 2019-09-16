process.setMaxListeners(Infinity)

const shell = require('shelljs');
const sockets = []

const arg = process.argv[2]
const nb = process.argv[3]
const thread = process.argv[4]
let close = false

process.on('SIGINT', () => {
  close = true
  console.log('----- END -----')
  sockets.forEach(s => s && s.disconnect())
  process.exit()
})

const fct = async () => {
  for (let i = 0; i < thread; i++) {
    while (true) {
      if (close) { break }
      console.log('----- START ' + i + ' ----- ')

      shell.exec('killall chrome', { silent: true })

      const socket = require('socket.io-client')('https://online-music.herokuapp.com', { transports: ['websocket'] });
      sockets[i] = socket

      try {
        const b = shell.exec('git fetch && git status', { silent: true })
        if (!b.match(/up to date/g)) {
          shell.exec('npm run rm && npm run clear', { silent: true })
          shell.exec('git reset --hard origin/master', { silent: true })
          shell.exec('git pull', { silent: true })
        }
      }
      catch (e) { }

      const start = require('./new')
      await start(socket, arg, nb, i)
      socket.disconnect()
      sockets[i] = null
    }
  }
}

fct()