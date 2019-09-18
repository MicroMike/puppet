process.setMaxListeners(Infinity)

const puppet = require('./puppet')
const shell = require('shelljs');
const socket = require('socket.io-client')('https://online-music.herokuapp.com', { transports: ['websocket'] });

const arg = process.argv[2]
const max = Number(process.argv[3])
const thread = Number(process.argv[4])

let CS = {}
let close = false

shell.exec('killall chrome', { silent: true })

try {
  shell.exec('expressvpn disconnect', { silent: true })
}
catch (e) { }

const exit = (noExit = false) => {
  !noExit && console.log('----- END ' + thread + ' -----')

  Object.values(CS).forEach(({ clientSocket, page, streamId }) => {
    clientSocket.disconnect()
    page.cls(true)
    delete CS[streamId]
  })

  if (!noExit) {
    close = true
    socket.disconnect()
    process.exit()
  }
}

process.on('SIGINT', () => {
  exit()
})

socket.on('Cdisconnect', () => {
  exit()
})

socket.on('CdisconnectU', () => {
  exit(true)
})

socket.on('killall', () => {
  exit()
})

//Assign the event handler to an event:

//Fire the 'scream' event:

let parentId

const inter = () => {
  console.log(Object.values(CS).length, max)
  if (Object.values(CS).length < max) {
    socket.emit('ping', { parentId, env: process.env, max })
  }

  setTimeout(() => {
    if (!close) { inter() }
  }, 1000 * 30);
}

socket.on('activate', () => {
  console.log(thread + ' activate', 'connected:' + !!parentId)

  socket.emit('parent', { parentId: arg + thread, connected: parentId, env: process.env, max })
  if (!parentId) { parentId = arg + thread }

  inter()
})

socket.on('run', async ({ runnerAccount, streamId }) => {
  try {
    const b = shell.exec('git fetch && git status', { silent: true })
    if (!b.match(/up to date/g)) {
      console.log('----- PULL ' + thread + ' -----')
      shell.exec('npm run rm && npm run clear', { silent: true })
      shell.exec('git reset --hard origin/master', { silent: true })
      shell.exec('git pull', { silent: true })
    }
    shell.exec('npm run buff', { silent: true })
  }
  catch (e) { }

  const accountInfo = runnerAccount.split(':')
  let player = accountInfo[0]
  let login = accountInfo[1]

  console.log(thread + ' account', runnerAccount, player)

  if (process.env.CHECK) {
    shell.exec('rm -Rf save/' + player + '_' + login, { silent: true })
  }

  socket.emit('wait', parentId)

  const page = await puppet('save/' + player + '_' + login, player.match(/napster/))

  if (!page) {
    console.log(thread + ' no page')
  }
  else {
    const clientSocket = require('socket.io-client')('https://online-music.herokuapp.com', { transports: ['websocket'] });
    CS[streamId] = { clientSocket, page, streamId }

    const runAccount = require('./runAccount');
    await runAccount(clientSocket, page, parentId, streamId, process.env, runnerAccount)

    delete CS[streamId]
    clientSocket.disconnect()
  }
})
