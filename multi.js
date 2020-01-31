process.setMaxListeners(Infinity)

const shell = require('shelljs');
const request = require('ajax-request');
// const sockets = []

const arg = process.argv[2]
const nb = Number(process.argv[3]) || 1

let close = false

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

process.on('SIGINT', () => {
  close = true
  request('https://online-music.herokuapp.com/clearUsed', () => {
    console.log('----- END ' + arg + ' -----')
    process.exit()
  })
})

const fct = async (i = 1) => {
  if (close) { return }

  console.log('----- START ' + arg + ' ----- ')

  const ram = shell.exec('free -m |awk \'{ print $2 }\' | awk \'NR == 2\'', { silent: true }).stdout.trim()
  shell.exec('node neww ' + arg + ' ' + nb, () => {
    if (close) { return }
    fct(i)
  })
}

for (let i = 1; i <= nb; i++) {
  if (close) { break }
  setTimeout(() => {
    if (close) { return }
    fct(i)
  }, 1000 * 3 * i);
}