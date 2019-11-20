process.setMaxListeners(0)

var fs = require('fs');
var shell = require('shelljs');
const puppet = require('./puppet')
const request = require('ajax-request');
const pass = '20192019'

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const type = process.env.TYPE
let check = false
let url

url = 'https://www.iheart.com/'

shell.exec('expressvpn disconnect', { silent: true })
shell.exec('expressvpn connect us')

const mails = [
  '@mega.zik.dj',
  '@nospam.ze.tc',
  '@speed.1s.fr',
  '@cool.fr.nf',
]

const getEmail = () => {
  const letters = 'abcdefghijklmnopqrstuvwxyz'
  const length = rand(2, 4)
  let mail = ''

  for (let i = 0; i < length; i++) {
    mail += letters[rand(letters.length)]
  }

  mail += '.'

  for (let i = 0; i < length; i++) {
    mail += letters[rand(letters.length)]
  }

  return mail + mails[rand(mails.length)]
}

const getCard = async () => {
  return new Promise(r => {
    request('https://online-music.herokuapp.com/card', (error, response, body) => {
      r(JSON.parse(body))
    })
  })
}

const main = async () => {
  const { cardNumber, month, year, code } = await getCard()
  const email = getEmail()
  const page = await puppet('save/heart_' + email)

  if (!page) { return }

  await page.gotoUrl(url)

  await page.clk('[title="Sign Up"]')
  await page.inst('#userName', email, true)
  await page.inst('#password', pass, true)
  await page.inst('#zipCode', '10001', true)
  await page.inst('#birthYear', String(1954 + rand(47)), true)
  await page.select('#gender', rand(2) ? 'gender.male' : 'gender.female')
  await page.clk('[data-test="signup-button"]')

  await page.waitFor(1000 * 5)
  await page.gotoUrl('https://www.iheart.com/subscribe?subscriptionId=IHEART_US_PREMIUM_TRIAL')

  const frameUrl = await page.evaluate(() => {
    const frame = document.querySelector('[data-test="subscription-iframe"]')
    return frame.src
  })

  const formPage = await page.np()
  await formPage.gotoUrl(frameUrl)

  await formPage.inst('#paymentAccountNumberText', cardNumber)
  await formPage.select('#expMonth', String(month))
  await formPage.select('#expYear', String(year))
  await formPage.inst('#paymentSecurityCode', code)
  await formPage.inst('#addressPostalCodeText', '75019')
  await formPage.clk('#btn-payflow-submit')

  request('https://online-music.herokuapp.com/addAccount?heart:' + email + ':20192019', function (error, response, body) {
    shell.exec('git add save/heart_' + email + ' && git commit -m "add account"')
    setTimeout(() => {
      process.exit()
    }, 1000 * 60 * 30);
  })
}

main()