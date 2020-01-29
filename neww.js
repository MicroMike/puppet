process.setMaxListeners(Infinity)

const puppet = require('./puppet')
const shell = require('shelljs');
const request = require('ajax-request');
const clientSocket = require('socket.io-client')('https://online-music.herokuapp.com', { transports: ['websocket'] });

const arg = process.argv[2]
const max = process.argv[3]

let CS = {}
let timeout
let close = false
let account

shell.exec('killall -9 chrome', { silent: true })

try {
  shell.exec('expressvpn disconnect', { silent: true })
}
catch (e) { }

const exit = (noExit = false) => {
  request('https://online-music.herokuapp.com/noUseAccount?' + account, () => {
    process.exit()
  })

  // !noExit && console.log('----- END ' + thread + ' -----')

  // Object.values(CS).forEach(({ clientSocket, page, streamId }) => {
  //   clientSocket.disconnect()
  //   page.cls(true)
  //   delete CS[streamId]
  // })

  // clearTimeout(timeout)

  // if (!noExit) {
  //   close = true
  //   socket.disconnect()
  //   process.exit()
  // }
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

const createCallback = async () => {
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
    const runAccount = require('./runAccount');
    await runAccount(clientSocket, page, parentId, streamId, process.env, account)
  
    exit()

    // clientSocket.on('Cdisconnect', () => {
    //   exit()
    // })

    // clientSocket.on('CdisconnectU', () => {
    //   exit(true)
    // })

    // clientSocket.on('killall', () => {
    //   exit()
    // })
  }
}

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

  request('https://online-music.herokuapp.com/useAccount', (error, response, body)=>{
    account = JSON.parse(body).account;
    clientSocket.emit('client', { parentId, streamId, account, max })
  })

})

clientSocket.on('mRun', async () => {
  createCallback()
})
