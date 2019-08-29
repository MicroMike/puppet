process.setMaxListeners(Infinity)

const puppet = require('./puppet')
const shell = require('shelljs');
const runAccount = require('./runAccount');
const socket = require('socket.io-client')('https://online-music.herokuapp.com');

shell.exec('killall chrome', { silent: true })

try {
  shell.exec('expressvpn disconnect', { silent: true })
}
catch (e) { }

const arg = process.argv[2]
const nb = process.argv[3]
const streams = {}
const pages = {}

let parentId

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const takeScreenshot = async (name, streamId) => {
  let img
  const { account, streamOn } = streams[streamId]

  try {
    await pages[streamId].screenshot({ path: name + '_' + account + '.png' });
    img = await image2base64(name + '_' + account + '.png')
  }
  catch (e) { }

  socket.emit('screen', { account, streamOn, streamId, img, log: account + ' => ' + name })
}

const stream = async (streamId) => {
  await takeScreenshot('stream', streamId)
  await pages[streamId].waitFor(3000)

  streams[streamId].countStream = streams[streamId].countStream + 1

  if (streams[streamId].countStream > 5) {
    streams[streamId].streamOn = false
  }

  if (streams[streamId].streamOn) { stream(streamId) }
}

socket.on('activate', () => {
  console.log('activate')
  socket.emit('parent', { s: streams, parentId: arg })
  if (!parentId) { parentId = arg }
})

socket.on('forceOut', streamId => {
  pages[streamId].cls(true)
  delete streams[streamId]
  delete pages[streamId]

  socket.emit('Cdisconnect', streamId)
})

socket.on('retryOk', streamId => {
  streams[streamId].streamOn = false
})

socket.on('streamOn', streamId => {
  streams[streamId].countStream = 0
  streams[streamId].streamOn = true

  stream(streamId)
})

socket.on('streamOff', streamId => {
  streams[streamId].streamOn = false
})

socket.on('screenshot', async streamId => {
  await takeScreenshot('getScreen', streamId)
})

socket.on('runScript', async ({ streamId, scriptText }) => {
  await pages[streamId].evaluate(scriptText)
})

socket.on('run', () => {
  console.log('run')
  if (Object.values(streams).length >= (nb || 20)) { return }

  try {
    const b = shell.exec('git fetch && git status', { silent: true })
    if (!b.match(/up to date/g)) {
      shell.exec('npm run rm && npm run clear', { silent: true })
      shell.exec('git reset --hard origin/master', { silent: true })
      shell.exec('git pull', { silent: true })
    }
  }
  catch (e) { }

  let ok = false
  while (!ok) {
    const streamId = rand(1000000)

    if (!streams[streamId]) {
      streams[streamId] = {
        id: streamId,
        parentId,
        streamOn: false,
        countStream: 0,
      }
      ok = true

      console.log('getAccount')
      socket.emit('getAccount', { streamId, parentId, env: process.env })
    }
  }
})

socket.on('account', async ({ account, streamId }) => {
  console.log('account')
  socket.emit('playerInfos', { streamId, account: account.split(':')[0], time: 'WAIT_PAGE', other: true })

  const page = await puppet('save/' + player + '_' + login, noCache)

  if (!page) {
    console.log('no page')
  }
  else {
    pages[streamId] = page
    streams[streamId].account = account
    streams[streamId].time = time

    runAccount(page, socket, parentId, streamId, process.env, account)
  }
})

socket.on('Cdisconnect', () => {
  socket.emit('disconnect')
  process.exit()
})

process.on('SIGINT', () => {
  socket.emit('disconnect')
  process.exit()
});
