process.setMaxListeners(Infinity)

const puppet = require('./puppet')
const shell = require('shelljs');
const socket = require('socket.io-client')('https://online-music.herokuapp.com', { transports: ['websocket'] });

const arg = process.argv[2]
const max = Number(process.argv[3]) || 1
const thread = Number(process.argv[4]) || 1

let CS = {}
let timeout
let close = false

shell.exec('killall -9 chrome', { silent: true })

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

  clearTimeout(timeout)

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

let parentId
let back

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const inter = () => {
  clearTimeout(timeout)
  timeout = setTimeout(() => {
    close && console.log('close true')
    back && console.log('back true')

    if (close) { return }

    if (Object.values(CS).length < max) {
      socket.emit('run', { parentId, env: process.env, max, back })
    }

    inter()
  }, rand(1000 * 60 * 2));
}

socket.on('activate', async () => {
  back = !!parentId
  console.log(thread + ' activate', 'connected:' + back)
  console.log(close, Object.values(CS).length, max)

  socket.emit('parent', { parentId: arg, connected: back, env: process.env, max })
  if (!back) { parentId = arg + thread }

  if (process.env.CHECK) { await socket.emit('run', { parentId, env: process.env, max }) }

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

  if (!runnerAccount) { return console.log('no account') }

  const accountInfo = runnerAccount.split(':')
  let player = accountInfo[0]
  let login = accountInfo[1]

  // console.log(thread + ' account', runnerAccount, player)

  if (process.env.CHECK) {
    shell.exec('rm -Rf save/' + player + '_' + login, { silent: true })
  }

  socket.emit('wait', parentId)

  let page

  try {
    page = await puppet('save/' + player + '_' + login, player.match(/napster/))
  }
  catch (e) { page = false }

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
