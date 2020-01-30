process.setMaxListeners(Infinity)

const puppet = require('./puppet')
const shell = require('shelljs');
const request = require('ajax-request');

const arg = process.argv[2]
const max = process.argv[3]

let CS = {}
let timeout
let close = false
let account

try {
  shell.exec('expressvpn disconnect', { silent: true })
}
catch (e) { }

const exit = () => {
  request('https://online-music.herokuapp.com/noUseAccount?' + account, () => {
    process.exit()
  })
}

process.on('SIGINT', () => {
  exit()
})

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

let back
let parentId

const streamId = rand(10000) + '-' + rand(10000) + '-' + rand(10000) + '-' + rand(10000)

const clientSocket = require('socket.io-client')('https://online-music.herokuapp.com', { transports: ['websocket'] });

clientSocket.on('activate', async (socketId) => {
  back = !!parentId
  parentId = arg

  try {
    const b = shell.exec('git fetch && git status', { silent: true })
    if (!b.match(/up to date/g)) {
      console.log('----- PULL ' + arg + ' -----')
      shell.exec('npm run rm && npm run clear', { silent: true })
      shell.exec('git reset --hard origin/master', { silent: true })
      shell.exec('git pull', { silent: true })
    }
    shell.exec('npm run buff', { silent: true })
  }
  catch (e) { }

  if (!account) {
    clientSocket.emit('canRun', { parentId, streamId, max })
  }
  else {
    clientSocket.emit('client', { parentId, streamId, account, max, back })
  }
})

clientSocket.on('canRun', async () => {
  request('https://online-music.herokuapp.com/useAccount', (error, response, body) => {
    account = JSON.parse(body).account;
    if (account) {
      clientSocket.emit('client', { parentId, streamId, account, max })
    }
    else {
      exit()
    }
  })
})

clientSocket.on('mRun', async () => {
  if (!account) { return console.log('no account') }

  const accountInfo = account.split(':')
  let player = accountInfo[0]
  let login = accountInfo[1]

  if (process.env.CHECK) {
    shell.exec('rm -Rf save/' + player + '_' + login, { silent: true })
  }

  let page

  try {
    page = await puppet('save/' + player + '_' + login, player.match(/napster/))
  }
  catch (e) { page = false }

  if (!page) {
    console.log(arg + ' no page')
  }
  else {
    await page.gotoUrl('https://google.com')

    const runAccount = require('./runAccount');
    await runAccount(clientSocket, page, parentId, streamId, process.env, account)

    exit()

    clientSocket.on('Cdisconnect', () => {
      exit()
    })

    // clientSocket.on('CdisconnectU', () => {
    //   exit(true)
    // })

    // clientSocket.on('killall', () => {
    //   exit()
    // })
  }
})
