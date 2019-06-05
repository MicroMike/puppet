const puppet = require('./puppet')
var shell = require('shelljs');

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const main = async () => {
  shell.exec('expressvpn disconnect', { silent: true })
  shell.exec('expressvpn connect uswd')

  const MP = await puppet('', true, true)
  await MP.gotoUrl('https://temp-mail.org/option/delete/')
  let M = await MP.get('#mail', 'value')
  M = M.split('@')[0]

  const create = async (i) => {
    const page = await puppet('', true, true)
    await page.gotoUrl('https://music.amazon.fr/home')
    await page.clk('.createAccountLink')

    let mailPage = await MP.np()
    const mail = M + i
    const email = mail + '@mega.zik.dj'

    const getMail = async () => {
      mailPage = await MP.np()
      await mailPage.gotoUrl('http://yopmail.com/')

      await mailPage.inst('.scpt', mail)
      await mailPage.clk('.sbut')
    }

    getMail()

    await page.inst('input#ap_customer_name', mail)
    await page.inst('input#ap_email', email)
    await page.inst('input#ap_password', '20192019')
    await page.inst('input#ap_password_check', '20192019')
    await page.clk('#continue')

    await page.waitFor(2000 + rand(2000))

    let code
    let nbMail
    const waitForCode = async () => {
      try {
        nbMail = await mailPage.evaluate(() => {
          const iframe = document.querySelector('#ifinbox')
          const selector = iframe && iframe.contentDocument.querySelectorAll('.m')
          return selector && selector.length
        })
        console.log('nbMail', nbMail)
        if (!nbMail) { throw 'fail' }

        const mailHere = await mailPage.evaluate(() => {
          const iframe = document.querySelector('#ifinbox')
          const m = iframe && iframe.contentDocument.querySelector('#m1')
          m && m.click()
          return m
        })
        console.log('mailHere', mailHere)
        if (!mailHere) { throw 'fail' }

        code = await mailPage.evaluate(() => {
          const iframe = document.querySelector('#ifmail')
          const selector = iframe && iframe.contentDocument.querySelector('.otp')
          return selector && selector.innerText
        })
        console.log('code', code)
        if (!code) { throw 'fail' }
      }
      catch (e) {
        await page.waitFor(1000 * 10 + rand(2000))
        await mailPage.rload()
        await waitForCode()
      }
    }

    await waitForCode()

    await page.inst('input[name="code"]', code)
    await page.clk('input[type="submit"]')

    const compare = async () => {
      await mailPage.clk('#lrefr')
      await page.waitFor(5000 + rand(2000))

      const compareNbMail = await mailPage.evaluate(() => {
        return document.querySelector('#ifinbox').contentDocument.querySelectorAll('.m').length
      })

      if (compareNbMail === nbMail) {
        await page.waitFor(2000 + rand(2000))
        await compare()
      }
    }

    await compare()

    await mailPage.evaluate(() => {
      let m = document.querySelector('#ifinbox').contentDocument.querySelector('#m1')
      m && m.click()
    })

    await page.waitFor(2000 + rand(2000))

    const url = await mailPage.evaluate(() => {
      return document.querySelector('#ifmail').contentDocument.querySelector('table tr td a').href
    })

    await page.gotoUrl(url)
    await page.inst('input#ap_password', '20192019')
    await page.clk('#signInSubmit')

    await page.inst('input#address-ui-widgets-enterAddressFullName', mail)
    await page.select('select#address-ui-widgets-countryCode-dropdown-nativeId', 'US')
    await page.inst('input#address-ui-widgets-enterAddressLine1', rand(30, 1) + ' ' + rand(30, 1) + 'st')
    await page.inst('input#address-ui-widgets-enterAddressCity', 'New-York')
    await page.inst('input#address-ui-widgets-enterAddressStateOrRegion', 'New-York')
    await page.inst('input#address-ui-widgets-enterAddressPostalCode', '10001')
    await page.inst('input#address-ui-widgets-enterAddressPhoneNumber', '06' + rand(89, 10) + rand(89, 10) + rand(89, 10) + rand(89, 10))
    await page.clk('input.a-button-input')
    await page.clk('input[name="address-ui-widgets-saveOriginalOrSuggestedAddress"]')
    await page.clk('#confirm-button a')
  }

  for (let i of 'defg') {
    create(i)
  }
}

main()