var shell = require('shelljs');
var socket = require('socket.io-client')('https://online-music.herokuapp.com');

// shell.exec('npm run reset')
shell.exec('npm run all')

socket.on('reset', () => {
  shell.exec('npm run all')
})