var shell = require('shelljs');
var socket = require('socket.io-client')('https://online-music.herokuapp.com');

socket.on('activate', () => {
  socket.emit('startRun')

  socket.on('stopped', () => {
    shell.exec('killall chrome', { silent: true })
  })

  socket.on('started', () => {
    shell.exec('npm run rm', { silent: true })
    shell.exec('git clean -fd && git reset --hard origin/master')
    shell.exec('git pull')
    shell.exec('npm run all')
  })

  socket.on('reseted', () => {²
    shell.exec('killall chrome', { silent: true })
    shell.exec('npm run rm', { silent: true })
    shell.exec('git clean -fd && git reset --hard origin/master')
    shell.exec('git pull')
    shell.exec('npm run all')
  })
})
