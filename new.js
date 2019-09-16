module.exports = async (socket, arg, nb, thread) => {
  return new Promise(async (r) => {
    const puppet = require('./puppet')
    const shell = require('shelljs');

    shell.exec('killall chrome', { silent: true })

    try {
      shell.exec('expressvpn disconnect', { silent: true })
    }
    catch (e) { }

    socket.on('Cdisconnect', () => {
      socket.disconnect()
      console.log('----- END ' + thread + ' -----')
      r(true)
    })

    socket.on('killall', () => {
      socket.disconnect()
      console.log('----- END ' + thread + ' -----')
      r(true)
    })

    //Assign the event handler to an event:

    //Fire the 'scream' event:

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
      if (!parentId) { parentId = arg + thread }
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
        shell.exec('npm run buff', { silent: true })
      }
      catch (e) { }

      const accountInfo = runnerAccount.split(':')
      let player = accountInfo[0]
      let login = accountInfo[1]

      console.log('account', runnerAccount, player)

      if (process.env.CHECK) {
        shell.exec('rm -Rf save/' + player + '_' + login, { silent: true })
      }

      socket.emit('wait', parentId)

      const page = await puppet('save/' + player + '_' + login, player.match(/napster/))

      if (!page) {
        console.log('no page')
        socket.emit('stopWait', parentId)
      }
      else {
        const runAccount = require('./runAccount');
        const client = await runAccount(page, parentId, streamId, process.env, runnerAccount)
        socket.emit('stopWait', parentId)
        client.disconnect()
      }
    })
  })
}