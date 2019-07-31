var shell = require('shelljs');

while (true) {
  shell.exec('xvfb-run -a node new ' + process.argv[2])
  console.log('RESET')
}