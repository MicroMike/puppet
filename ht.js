const shell = require('shelljs');
const request = require('ajax-request');

const old = {};

const main = async () => {
  const getCard = async () => {
    return new Promise(r => {
      request('https://online-music.herokuapp.com/card', (error, response, body) => {
        r(JSON.parse(body))
      })
    })
  }

  const newCard = await getCard()

  if (!old.cardNumber || old.cardNumber !== newCard.cardNumber) {
    old = { ...newCard }

    shell.exec('node heart')
    shell.exec('npm run ctidal')
  }

  setTimeout(() => {
    main()
  }, 1000 * 60 * 60);
}

main()