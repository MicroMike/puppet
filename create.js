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
  await page.clk('body > div.content > div > div > div > div:nth-child(2) > div > button > div')

  await mailPage.gotoUrl('https://temp-mail.org/option/delete/')
  const email = await mailPage.get('#mail', 'value')
  console.log(email)

  await mailPage.cls(true)

  await captcha(page, 'https://login.tidal.com/', keyCaptcha, 'input#email', email)

  await page.inst('input#new-password', email)
  await page.inst('input#password2', email)
  await page.waitFor(2000 + rand(2000))
  await page.select('select#tbi-day', String(rand(25, 1)))
  await page.waitFor(2000 + rand(2000))
  await page.select('select#tbi-month', String(rand(12, 1)))
  await page.waitFor(2000 + rand(2000))
  await page.select('select#tbi-year', String(1954 + rand(47)))

  await page.waitFor(2000 + rand(2000))
  await page.jClk('#terms1')
  await page.clk('#registration-step-2 > button > div')

  await page.waitFor(2000 + rand(2000))

  await page.jClk('#premium > div:nth-child(2) > div > div > div > div > div > div:nth-child(2) > div:nth-child(2) > div > button', true)

  await page.waitFor(2000 + rand(2000))

  await page.inst('#ccname', 'Assoune Mike')
  await page.inst('#cardnumber', '5273462800749229')
  await page.inst('#ccmonth', '04')
  await page.inst('#ccyear', '24')
  await page.inst('#cvc', '474')

  await page.clk('#card-form > button')
}

main()
