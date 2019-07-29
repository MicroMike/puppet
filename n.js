var shell = require('shelljs');

while (true) {
  shell.exec('xvfb-run node new ' + process.argv[2])
}