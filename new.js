process.setMaxListeners(Infinity)

const puppet = require('./puppet')
const shell = require('shelljs');
const socket = require('socket.io-client')('https://online-music.herokuapp.com', { transports: ['websocket'] });

shell.exec('killall chrome', { silent: true })

try {
  shell.exec('expressvpn disconnect', { silent: true })
}
catch (e) { }

process.on('SIGINT', () => {
  socket.emit('disconnect')
  console.log('----- END -----')
  process.exit()
})

socket.on('Cdisconnect', () => {
  socket.emit('disconnect')
  console.log('----- END -----')
  process.exit()
})

socket.on('killall', () => {
  socket.emit('disconnect')
  console.log('----- END -----')
  shell.exec('killall node')
})

//Assign the event handler to an event:

//Fire the 'scream' event:

const arg = process.argv[2]
const nb = process.argv[3]

let parentId

const inter = () => {
  if (socket.connected) {
    socket.emit('ping')
    setTimeout(() => {
      inter()
    }, 1000 * 60);
  }
}

socket.on('activate', () => {
  console.log('activate', 'connected:' + !!parentId)
  socket.emit('parent', { parentId: arg, connected: parentId, env: process.env, max: nb })
  if (!parentId) { parentId = arg }
  inter()
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

  const accountInfo = runnerAccount.split(':')
  let player = accountInfo[0]
  let login = accountInfo[1]

  console.log('account', runnerAccount, player)
  socket.emit('playerInfos', { parentId, streamId, account: player + ':' + login, time: 'WAIT_PAGE', other: true })

  if (process.env.CHECK) {
    shell.exec('rm -Rf save/' + player + '_' + login, { silent: true })
  }

  const page = await puppet('save/' + player + '_' + login, player.match(/napster/))

  if (!page) { console.log('no page') }
  else {
    const runAccount = require('./runAccount');
    const client = await runAccount(page, parentId, streamId, process.env, runnerAccount)
    client.disconnect()
  }
})
