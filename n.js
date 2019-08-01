process.setMaxListeners(0)

var shell = require('shelljs');

while (true) {
  shell.exec('node new ' + process.argv[2])
  console.log('RESET')
}