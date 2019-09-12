process.setMaxListeners(Infinity)

var shell = require('shelljs');

const arg = process.argv[2]
const nb = process.argv[3]

while (true) {
  console.log('----- START -----')
  try {
    const b = shell.exec('git fetch && git status', { silent: true })
    if (!b.match(/up to date/g)) {
      shell.exec('npm run rm && npm run clear', { silent: true })
      shell.exec('git reset --hard origin/master', { silent: true })
      shell.exec('git pull', { silent: true })
    }
  }
  catch (e) { }

  shell.exec('xvfb-run -a node --max-old-space-size=12288 new ' + arg + ' ' + nb)
}