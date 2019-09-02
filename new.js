process.setMaxListeners(Infinity)

const puppet = require('./puppet')
const shell = require('shelljs');
const socket = require('socket.io-client')('https://online-music.herokuapp.com');
var events = require('events');

const eventEmitter = new events.EventEmitter();

shell.exec('killall chrome', { silent: true })

try {
  shell.exec('expressvpn disconnect', { silent: true })
}
catch (e) { }


//Assign the event handler to an event:

//Fire the 'scream' event:

const arg = process.argv[2]
const nb = Number(process.argv[3]) || 20
const streams = {}

let parentId

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

socket.on('activate', () => {
  console.log('activate', 'connected:' + !!parentId)
  socket.emit('parent', { parentId: arg, connected: parentId, s: streams })
  if (!parentId) { parentId = arg }
})

socket.on('forceOut', async streamId => {
  if (streams[streamId]) {
    eventEmitter.emit('EforceOut', streamId);
    delete streams[streamId]
  }
})

socket.on('retryOk', streamId => {
  if (streams[streamId]) {
    streams[streamId].streamOn = false
  }
})

socket.on('streamOn', streamId => {
  eventEmitter.emit('EstreamOn', streamId);
})

socket.on('streamOff', streamId => {
  eventEmitter.emit('EstreamOff', streamId);
  streams[streamId].streamOn = false
})

socket.on('screenshot', async streamId => {
  eventEmitter.emit('Escreen', 'getScreen', streamId);
})

socket.on('runScript', async ({ streamId, scriptText }) => {
  eventEmitter.emit('ErunScript', streamId, scriptText);
})

eventEmitter.on('playerInfos', datas => {
  const stream = streams[datas.streamId]

  if (stream) {
    streams[datas.streamId].infos = datas
  }
});

let prevent = false
socket.on('run', () => {
  if (prevent) { return }
  prevent = true

  if (Object.values(streams).length >= nb) { return }

  try {
    const b = shell.exec('git fetch && git status', { silent: true })
    if (!b.match(/up to date/g)) {
      console.log('----- PULL -----')
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

socket.on('account', async ({ runnerAccount, streamId }) => {
  prevent = false

  const accountInfo = runnerAccount.split(':')
  let player = accountInfo[0]
  let login = accountInfo[1]

  console.log('account', runnerAccount, player)
  socket.emit('playerInfos', { parentId, streamId, account: login, time: 'WAIT_PAGE', other: true })

  const page = await puppet('save/' + player + '_' + login, player.match(/napster/))

  if (!page) {
    console.log('no page')
    socket.emit('Cdisconnect', streamId)
    delete streams[streamId]
  }
  else {
    streams[streamId].account = runnerAccount

    const runAccount = require('./runAccount');
    try { runAccount(page, socket, parentId, streamId, process.env, runnerAccount, eventEmitter) } catch (e) { console.log(e) }
  }
})

let inter = setInterval(() => {
  socket.emit('streamInfos', streams)
}, 1000 * 5)

socket.on('Cdisconnect', () => {
  clearInterval(inter)
  console.log('----- RESTART -----')
  socket.emit('disconnect')
  process.exit()
})

process.on('SIGINT', () => {
  clearInterval(inter)
  console.log('----- RESTART -----')
  socket.emit('disconnect')
  process.exit()
});
