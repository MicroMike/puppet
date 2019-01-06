let one = []
let two = []
let valid = []

const fs = require('fs');

fs.readFile('check.txt', 'utf8', function (err, data) {
  if (err) return console.log(err);
  one = data.split(',')

  while (one.length) {
    let account = one.shift()
    if (one.indexOf(account) >= 0) {
      console.log(account)
    }
    else {
      valid.push(account)
    }
  }

  fs.readFile('napsterAccountDel.txt', 'utf8', function (err, data) {
    if (err) return console.log(err);
    two = data.split(',')
    valid = valid.filter(account => two.indexOf(account) === -1)

    fs.writeFile('check.txt', valid, function (err) {
      if (err) return console.log(err);
    });
  })

});
