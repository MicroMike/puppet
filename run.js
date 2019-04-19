var shell = require('shelljs');
var socket = require('socket.io-client')('https://online-music.herokuapp.com');

socket.on('activate', () => {
  socket.emit('startRun')

  socket.on('stop', () => {
    shell.exec('killall chrome', { silent: true })
  })

  socket.on('start', () => {
    shell.exec('npm run rm', { silent: true })
    shell.exec('git clean -fd && git reset --hard origin/master')
    shell.exec('git pull')
    shell.exec('npm run all')
  })

  socket.on('reset', () => {
    shell.exec('killall chrome', { silent: true })
    shell.exec('npm run rm', { silent: true })
    shell.exec('git clean -fd && git reset --hard origin/master')
    shell.exec('git pull')
    shell.exec('npm run all')
  })
})

shell.exec('killall chrome', { silent: true })
shell.exec('npm run rm', { silent: true })
shell.exec('git clean -fd && git reset --hard origin/master')
shell.exec('git pull')
shell.exec('npm run all')
