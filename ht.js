const shell = require('shelljs');
const request = require('ajax-request');

let old;

const main = async () => {
  const getCard = async () => {
    return new Promise(r => {
      request('https://online-music.herokuapp.com/card', (error, response, body) => {
        r(JSON.parse(body))
      })
    })
  }

  const newCard = await getCard()

  if (!old || old.cardNumber !== newCard.cardNumber) {
    old = { ...newCard }

    shell.exec('node heart')
    shell.exec('npm run ctidal')
  }

  setTimeout(() => {
    main()
  }, 1000 * 60);
}

main()