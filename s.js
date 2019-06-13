var shell = require('shelljs');

while (true) {
  shell.exec('xvfb-run -a node run')
}