var fs = require('fs');
var shell = require('shelljs');

let count = 0

fs.readFile('napsterAccount.txt', 'utf8', function (err, data) {
  if (err) return console.log(err);
  accounts = data.split(',').filter(e => e)
  accounts = accounts.filter(m => m.split(':')[0] === 'tidal')

  console.log(accounts.length)

  const loop = () => {
    shell.exec('CHECK=true ACCOUNT=' + accounts[count++] + ' node runAccount', () => { })

    if (count < accounts.length) {
      setTimeout(() => {
        loop()
      }, 1000 * 15);
    }
  }

  loop()
});