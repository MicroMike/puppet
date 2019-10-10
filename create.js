process.setMaxListeners(0)

var fs = require('fs');
var shell = require('shelljs');
const puppet = require('./puppet')
const captcha = require('./captcha')
const request = require('ajax-request');
const amazon = false
const pass = '20192019'

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const type = process.env.TYPE
let check = false
let url

if (type === 'tidal') {
  url = 'http://offer.tidal.com'
  keyCaptcha = '6Lf-ty8UAAAAAE5YTgJXsS3B-frcWP41G15z-Va2'
}
else if (type === 'napster') {
  url = 'https://us.napster.com/soundtracking/special'
}

shell.exec('expressvpn disconnect', { silent: true })
if (type === 'tidal') {
  shell.exec('expressvpn connect dk')
}
else {
  shell.exec('expressvpn connect nl')
}

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

let count
const main = async () => {
  const cardData = await getCard()
  const { cardNumber, cardMonth, cardYear, cardCode } = cardData
  console.log(cardNumber, cardMonth, cardYear, cardCode)
  return
  if (type === 'tidal') {
    const email = getEmail()
    const page = await puppet('save/tidal_' + email)

    if (!page) { return }

    await page.gotoUrl(url)
    await page.clk('body > div.content > div > div > div > div:nth-child(2) > div > button > div')

    // await page.inst('input#email', email, true)
    // await page.clk('input#email + button')
    // await captcha(tidalLog, 'https://listen.tidal.com/', keyCaptcha, username, m)

    try {
      await page.inst('input#email', email, true)
      await page.clk('#recap-invisible')

      await page.waitFor(5000 + rand(2000))

      const exist = await page.ext('input#new-password')
      if (!exist) { throw 'fail' }
    }
    catch (e) {
      await captcha(page, 'https://login.tidal.com/', keyCaptcha, 'input#email', email)
    }

    const waitForPass = async () => {
      try {
        const exist = await page.ext('input#new-password')
        if (!exist) { throw 'failed' }
      }
      catch (e) {
        await waitForPass()
      }
    }

    await waitForPass()

    await page.inst('input#new-password', pass, true)
    await page.waitFor(2000 + rand(2000))
    await page.inst('input#password2', pass, true)
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

    await page.clk('#premium > div:nth-child(2) div > button')
    // await page.clk('button.btn-success:enabled')

    await page.waitFor(2000 + rand(2000))
    await page.inst('input#cardholderName', 'OSNAUSE KIME', true)

    await page.waitFor(2000 + rand(2000))
    await page.keyboard.press('Tab');
    await page.waitFor(2000 + rand(2000))
    await page.keyboard.type(cardNumber, { delay: 150 })

    await page.waitFor(2000 + rand(2000))
    await page.keyboard.press('Tab');
    await page.waitFor(2000 + rand(2000))
    await page.keyboard.type(Number(cardMonth) > 9 ? cardMonth : '0' + cardMonth, { delay: 150 })
    await page.keyboard.type(cardYear.slice(2), { delay: 150 })

    await page.waitFor(2000 + rand(2000))
    await page.keyboard.press('Tab');
    await page.waitFor(2000 + rand(2000))
    await page.keyboard.type(code, { delay: 150 })

    // await page.inst('input#encryptedCardNumber', cardNumber, true)
    // await page.inst('input#encryptedExpiryDate', Number(month) > 9 ? month : '0' + month + year.slice(2), true)
    // await page.inst('input#encryptedSecurityCode', code, true)
    await page.waitFor(2000 + rand(2000))
    await page.clk('button.btn-success:enabled')
    await page.waitFor(2000 + rand(2000))

    // PAYPAL
    // await page.inst('input#email', 'micro.smith@mega.zik.dj', true)
    // await page.inst('input#password', pass, true)
    // await page.clk('button#btnLogin')
    // await page.clk('input#confirmButtonTop')
    //PAYPAL

    const waitForFinishPay = async () => {
      try {
        const exist = await page.ext('a[href="/download"]')
        if (!exist) { throw 'wait' }
      }
      catch (e) {
        await waitForFinishPay()
      }
    }

    await waitForFinishPay()
    await page.waitFor(2000 + rand(2000))

    const tidalConnect = async (m) => {
      const loggedDom = '[class*="userLoggedIn"]'
      const username = 'input#email'
      const password = '[name="password"]'
      const goToLogin = '#sidebar section button + button'
      const keyCaptcha = '6Lf-ty8UAAAAAE5YTgJXsS3B-frcWP41G15z-Va2'
      const reLog = 'body > div > div.main > div > div > div > div > div > button'
      const playBtn = '[class*="controls"] button + button'

      const tidalLog = await puppet('save/tidal_' + m)
      await tidalLog.gotoUrl('https://listen.tidal.com/')
      await tidalLog.jClk(goToLogin)

      const tryClick = async () => {
        const done = await tidalLog.jClk(reLog, true)
        const existInput = await tidalLog.ext(username)

        if (!done && !existInput) {
          await tidalLog.waitFor(2000 + rand(2000))
          await tryClick()
        }

        return existInput
      }

      const needLog = await tryClick()

      if (needLog) {
        try {
          await tidalLog.inst(username, m, true)
          await tidalLog.clk('#recap-invisible')

          await page.waitFor(5000 + rand(2000))

          const exist = await tidalLog.ext(password)
          if (!exist) { throw 'fail' }
        }
        catch (e) {
          await captcha(tidalLog, 'https://listen.tidal.com/', keyCaptcha, username, m)
        }

        const waitForPass = async () => {
          try {
            const exist = await tidalLog.ext(password)
            if (!exist) { throw 'failed' }
          }
          catch (e) {
            await waitForPass()
          }
        }

        await waitForPass()

        await tidalLog.inst(password, pass, true)
        await tidalLog.clk('body > div > div > div > div > div > div > div > form > button', 'tidal connect')

        const logged = await tidalLog.wfs(loggedDom)
        if (!logged) { throw 'del' }

        const al = require('./albums')
        album = al['tidal'][rand(al['tidal'].length)]

        await tidalLog.gotoUrl(album)
        await tidalLog.clk(playBtn)
        await tidalLog.waitFor(1000 * 45)

        shell.exec('git add save/tidal_' + m + ' && git commit -m "add account" && git push')
        await tidalLog.cls(true)
      }
    }

    request('https://online-music.herokuapp.com/addAccount?tidal:' + email + ':' + pass, function (error, response, body) { })
    shell.exec('git add save/tidal_' + email + ' && git commit -m "add account"')
    // await tidalConnect(email)

    await page.gotoUrl('https://my.tidal.com/')
    await page.inst('.login-email', email, true)
    await page.inst('[name="password"]', pass, true)
    await page.clk('.btn.action.login-cta')
    await page.clk('.box-family a')

    const addTidal = async () => {
      const tMail = getEmail()
      console.log(tMail)

      const addPage = await page.np()
      await addPage.gotoUrl('https://my.tidal.com/dk/family/add')

      await addPage.inst('[name="email"]', tMail, true)
      await addPage.inst('[name="emailConfirm"]', tMail, true)
      await addPage.inst('[name="password"]', pass, true)
      await addPage.clk('.btn-full')

      request('https://online-music.herokuapp.com/addAccount?tidal:' + tMail + ':' + pass, function (error, response, body) { })

      await tidalConnect(tMail)
    }

    addTidal()
    addTidal()
    addTidal()
    addTidal()
    addTidal()

    await page.waitFor(5000 + rand(2000))
  }
  else if (type === 'napster') {
    const page = await puppet('', true)

    if (!page) { return }

    await page.gotoUrl(url)

    const email = getEmail()

    // const mailPage = await page.np()
    // await mailPage.gotoUrl('https://temp-mail.org')
    // const email = await mailPage.get('#mail', 'value')

    console.log(email)
    await page.bringToFront()

    await page.clk('a.button.extra-large')
    await page.waitFor(2000 + rand(2000))
    await page.inst('input#txtEmail', email)
    await page.inst('input#txtPassword', pass)
    await page.inst('input#txtConfirmPassword', pass)
    // await page.waitFor(2000 + rand(2000))
    // await page.select('select#age', String(20 + rand(50)))
    // await page.waitFor(2000 + rand(2000))
    // await page.select('select#gender', 'U')
    await page.clk('#chkTermsOfUse')
    await page.clk('#signupSubmitButton')

    if (amazon) {
      await page.waitFor(2000 + rand(2000))
      await page.clk('#rdbPaymentMethodsAmazon')
      await page.clk('#OffAmazonPaymentsWidgets1')

      let payPage
      const waitForPopup = async () => {
        try {
          payPage = await page.lastPage()
          const exist = await payPage.ext('#createAccountSubmit')
          if (!exist) { throw 'Failed' }
        }
        catch (e) {
          await waitForPopup()
        }
      }

      await waitForPopup()

      await payPage.clk('#createAccountSubmit')
      await payPage.inst('input#ap_customer_name', email)
      await payPage.inst('input#ap_email', email)
      await payPage.inst('input#ap_password', pass)
      await payPage.inst('input#ap_password_check', pass)
      await payPage.clk('#continue')

      const waitForMail = async () => {
        try {
          await mailPage.clk('.col-box a')
        }
        catch (e) {
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

      await payPage.jClk('#amazonpay-accept-button-consent input')
      await payPage.jClk('input[type="submit"]')

      await page.waitFor(10000 + rand(2000))
      await page.mouse.click(425, 430)

      const waitForAmazon = async () => {
        try {
          payPage = await page.lastPage()
          const exist = await payPage.ext('input[name="ppw-accountHolderName"]')
          if (!exist) { throw 'Failed' }
        }
        catch (e) {
          await waitForAmazon()
        }
      }

      await waitForAmazon()

      await payPage.inst('input[name="ppw-accountHolderName"]', 'Assoune Mike')
      await payPage.inst('input[name="addCreditCardNumber"]', cardNumber)
      await payPage.select('select[name="ppw-expirationDate_month"]', cardMonth)
      await payPage.select('select[name="ppw-expirationDate_year"]', cardYear)
      await payPage.clk('input[name="ppw-widgetEvent:AddCreditCardEvent"]')

      await payPage.inst('input[name="ppw-line1"]', '23 56st')
      await payPage.inst('input[name="ppw-city"]', 'New-York')
      await payPage.inst('input[name="ppw-stateOrRegion"]', 'New-York')
      await payPage.inst('input[name="ppw-postalCode"]', '10001')
      await payPage.inst('input[name="ppw-phoneNumber"]', '0645789458')
      await payPage.clk('input[name="ppw-widgetEvent:AddAddressEvent"]')
      await payPage.clk('input[name="ppw-widgetEvent:UseSuggestedAddressEvent"]')

      await page.waitFor(5000 + rand(2000))

      await page.evaluate(() => {
        const frames = document.querySelectorAll('iframe')
        const lastF = frames && frames[frames.length - 1]
        lastF.scrollIntoView()
      })
    }
    else {
      await page.waitFor(2000 + rand(2000))
      await page.clk('#rdbPaymentMethodsCards')

      await page.inst('input#paymentAccountNumberText', cardNumber)
      await page.select('select#expMonth', cardMonth)
      await page.select('select#expYear', cardYear)
      await page.inst('input#paymentSecurityCode', cardCode)
      await page.inst('input#firstName', 'Assoune')
      await page.inst('input#lastName', 'Mike')
    }

    await page.waitFor(2000 + rand(2000))
    await page.mouse.click(188, 53)
    await page.clk('#btn-payflow-submit')

    const waitForDone = async () => {
      try {
        const exist = await page.ext('#add-earn-account-successful')
        if (!exist) { throw 'Failed' }
      }
      catch (e) {
        await waitForDone()
      }
    }

    await waitForDone()

    request('https://online-music.herokuapp.com/addAccount?napster:' + email + ':' + pass, async (error, response, body) => {
      shell.exec('expressvpn disconnect', { silent: true })
      shell.exec('expressvpn connect nl')

      main()
      await page.cls()
    })

  }

  // await page.cls(true)
  // await mailPage.cls(true)
}
//5273 4628 0074 9229 04/24 474
//5469 2306 4666 7424 08/22 820
//5273 4628 2344 1010 08/24 058
main()
