var shell = require('shelljs');

while (true) {
  shell.exec('xvfb-run node run ' + process.argv[2])
}