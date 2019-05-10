process.setMaxListeners(0)

var fs = require('fs');
var shell = require('shelljs');
const puppet = require('./puppet')
const captcha = require('./captcha')

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const type = process.env.TYPE

let url

if (type === 'tidal') {
  url = 'http://offer.tidal.com'
  keyCaptcha = '6Lf-ty8UAAAAAE5YTgJXsS3B-frcWP41G15z-Va2'
}
else if (type === 'napster') {
  url = 'https://us.napster.com/soundtracking/special'
}

const main = async () => {
  const page = await puppet('', true)
  const mailPage = await page.np()

  if (!page) { return }

  await page.gotoUrl(url)

  await mailPage.gotoUrl('https://temp-mail.org/option/delete/')
  const email = await mailPage.get('#mail', 'value')
  console.log(email)

  if (type === 'tidal') {
    await page.clk('body > div.content > div > div > div > div:nth-child(2) > div > button > div')

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
    await page.inst('#postalCode', '10001')

    await page.clk('#card-form > button')
  }
  else if (type === 'napster') {
    await page.clk('.button.extra-large')
    await page.inst('input#txtEmail', email)
    await page.inst('input#txtPassword', '20192019')
    // await page.inst('input#txtConfirmPassword', '20192019')
    await page.waitFor(2000 + rand(2000))
    await page.select('select#age', String(20 + rand(50)))
    await page.waitFor(2000 + rand(2000))
    await page.select('select#gender', 'U')
    // await page.clk('#chkTermsOfUse')
    await page.clk('#signupSubmitButton')

    const payPage = await page.np()
    await payPage.gotoUrl('https://payments.amazon.com/jr/your-account/')
    await payPage.clk('#createAccountSubmit')

    const amazonCaptcha = false
    const fillForm = async () => {
      await payPage.inst('input#ap_customer_name', email)
      await payPage.inst('input#ap_email', email)
      await payPage.inst('input#ap_password', email)
      await payPage.inst('input#ap_password_check', email)
      if (!amazonCaptcha) {
        await payPage.clk('#continue')
      }
    }

    await fillForm()

    const waitForMail = async () => {
      try {
        await mailPage.clk('.col-box a')
      }
      catch (e) {
        if (!amazonCaptcha) {
          amazonCaptcha = true
          await fillForm()
        }
        await waitForMail()
      }
    }

    await waitForMail()

    await mailPage.wfs('.inbox-data-content-intro')
    await page.waitFor(2000 + rand(2000))
    let code = await mailPage.get('.inbox-data-content-intro', 'innerText')
    code = code && code.match(/\d+/g)[0]

    await payPage.inst('input[name="code"]', code)
    await payPage.clk('input[type="submit"]')

    // 5144720700853723
    // 04
    // 23

  }

  await mailPage.cls(true)
}

main()
