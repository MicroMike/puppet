var shell = require('shelljs');

const arg = process.argv[2]
const nb = process.argv[3]

while (true) {
  shell.exec('xvfb-run node n ' + arg + ' ' + nb + process.argv[2])
}