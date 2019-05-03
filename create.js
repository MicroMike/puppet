process.setMaxListeners(0)

var fs = require('fs');
var shell = require('shelljs');
const puppet = require('./puppet')
const captcha = require('./captcha')

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

let url

url = 'http://offer.tidal.com'
keyCaptcha = '6Lf-ty8UAAAAAE5YTgJXsS3B-frcWP41G15z-Va2'

const main = async () => {
  const page = await puppet('', true)
  const mailPage = await puppet('', true)

  if (!page) { return }

  await page.gotoUrl(url)
  await page.click('body > div.content > div > div > div > div:nth-child(2) > div > button > div')

  await mailPage.gotoUrl('https://temp-mail.org/fr/option/delete/')
  const email = await mailPage.get('#mail', 'value')

  await mailPage.cls(true)

  await captcha(page, 'https://login.tidal.com/', keyCaptcha, 'input#email', email)

  await page.inst('input#new-password', email)
  await page.inst('input#password2', email)
  await page.select('select#tbi-day', rand(25, 1))
  await page.select('select#tbi-month', rand(12, 1))
  await page.select('select#tbi-year', 1954 + rand(47))

  await page.click('#registration-step-2 > button > div')
}

main()
