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
const nb = process.argv[3]
let streams = {}

let parentId

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

socket.on('activate', () => {
  console.log('activate', 'connected:' + !!parentId)
  socket.emit('parent', { parentId: arg, connected: parentId, s: streams, env: process.env, max: nb })
  if (!parentId) { parentId = arg }
})

socket.on('forceOut', async streamId => {
  eventEmitter.emit('EforceOut', streamId);
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

socket.on('streamInfos', () => {
  socket.emit('streamInfos', ({ s: streams, parentId }))
  Object.keys(streams).forEach(k => { streams[k].plays = 0 })
})

socket.on('Cdisconnect', () => {
  console.log('----- END -----')
  process.exit()
})

socket.on('kill', () => {
  console.log('----- END -----')
  shell.exec('killall node', { silent: true })
})

socket.on('run', async ({ runnerAccount, streamId }) => {
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

  streams[streamId] = {
    id: streamId,
    parentId,
    streamOn: false,
    countStream: 0,
    account: runnerAccount
  }

  const accountInfo = runnerAccount.split(':')
  let player = accountInfo[0]
  let login = accountInfo[1]

  console.log('account', runnerAccount, player)
  socket.emit('playerInfos', { parentId, streamId, account: player + ':' + login, time: 'WAIT_PAGE', other: true })

  if (process.env.CHECK) {
    shell.exec('rm -Rf save/' + player + '_' + login, { silent: true })
  }

  const page = await puppet('save/' + player + '_' + login, player.match(/napster/))

  if (!page) {
    console.log('no page')
    socket.emit('Cdisconnect', streamId)
    delete streams[streamId]
  }
  else {
    const runAccount = require('./runAccount');
    await runAccount(page, socket, parentId, streamId, process.env, runnerAccount, eventEmitter)
    delete streams[streamId]
  }
})

eventEmitter.on('playerInfos', datas => {
  const stream = streams[datas.streamId]

  if (stream) {
    streams[datas.streamId].infos = datas
  }
});

eventEmitter.on('plays', ({ streamId }) => {
  streams[streamId].plays = streams[streamId].plays ? streams[streamId].plays + 1 : 1
});

process.on('SIGINT', () => {
  console.log('----- END -----')
  socket.emit('Ddisconnect')
  process.exit()
});
