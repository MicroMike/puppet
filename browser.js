const puppet = require('./puppet')
var shell = require('shelljs');

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

let MP
const getEmail = async () => {
  await MP.gotoUrl('https://temp-mail.org/option/delete/')
  let M = await MP.get('#mail', 'value')
  M = M.split('@')[0]
  return M
}

const main = async () => {
  shell.exec('expressvpn disconnect', { silent: true })
  shell.exec('expressvpn connect fr')

  const mainPage = await puppet('', true, true)
  MP = await mainPage.np()

  const create = async (i = null) => {
    const page = !i ? mainPage : await puppet('', true, true)
    await page.gotoUrl('https://music.amazon.fr/home')
    try {
      await page.clk('.createAccountLink')
    }
    catch (e) {
      await page.clk('.signIn')
      await page.clk('.createAccountLink')
    }

    let mailPage = await page.np()
    const mail = await getEmail()
    const email = mail + '@mega.zik.dj'

    await mailPage.gotoUrl('http://yopmail.com/')
    await mailPage.inst('.scpt', mail)
    await mailPage.clk('.sbut')

    await page.inst('input#ap_customer_name', mail)
    await page.inst('input#ap_email', email)
    await page.inst('input#ap_password', '20192019')
    await page.inst('input#ap_password_check', '20192019')
    await page.clk('#continue')

    await page.waitFor(2000 + rand(2000))

    let code
    let url

    const waitFor = async (isCode) => {
      try {
        const mailHere = await mailPage.evaluate(() => {
          const iframe = document.querySelector('#ifinbox')
          const m = iframe && iframe.contentDocument.querySelector('#m1')
          m && m.click()
          return m
        })
        console.log('mailHere', mailHere)
        if (!mailHere) { throw 'fail' }

        code = isCode && await mailPage.evaluate(() => {
          const iframe = document.querySelector('#ifmail')
          const selector = iframe && iframe.contentDocument.querySelector('.otp')
          const code = selector && selector.innerText

          return code
        })

        console.log('code', code)
        if (code) { return }

        url = !isCode && await mailPage.evaluate(() => {
          const iframe = document.querySelector('#ifmail')
          const link = iframe && iframe.contentDocument.querySelector('table tr td a')
          const url = link && link.href

          return url
        })

        console.log('url', url)
        if (url) { return }

        console.log('fail')
        throw 'fail'
      }
      catch (e) {
        await mailPage.waitFor(1000 * 10 + rand(2000))
        await mailPage.clk('#lrefr')
        await waitFor(isCode)
      }
    }

    await waitFor(true)

    await page.inst('input[name="code"]', code)
    await page.clk('input[type="submit"]')

    if (i) {
      await waitFor()
      await page.gotoUrl(url)
    }
    else {
      await page.clk('.buttonOption')
    }

    if (i) {
      await page.inst('input#ap_email', email, false, true)
      await page.inst('input#ap_password', '20192019', false, true)
      await page.jClk('#signInSubmit')
    }
    else

      if (!i) {
        await page.inst('input[name="ppw-accountHolderName"]', 'Assoune Mike')
        await page.inst('input[name="addCreditCardNumber"]', '5273462879953488')
        await page.select('select[name="ppw-expirationDate_month"]', '5')
        await page.select('select[name="ppw-expirationDate_year"]', '2024')
        await page.inst('input[name="addCreditCardVerificationNumber"]', '789')
        await page.clk('input[name="ppw-widgetEvent:AddCreditCardEvent"]')
      }

    const waitForSelect = async () => {
      try {
        const exist = await page.ext('select#address-ui-widgets-countryCode-dropdown-nativeId')
        if (!exist) { throw 'Failed' }
      }
      catch (e) {
        await waitForSelect()
      }
    }

    await waitForSelect()

    await page.select('select#address-ui-widgets-countryCode-dropdown-nativeId', 'FR')
    await page.waitFor(2000 + rand(2000))

    await page.inst('input#address-ui-widgets-enterAddressFullName', mail)
    await page.inst('input[name="ppw-line1"]', rand(50, 1) + ' rue de paris')
    await page.inst('input[name="ppw-city"]', 'Paris')
    await page.inst('input[name="ppw-stateOrRegion"]', 'Paris')
    await page.inst('input[name="ppw-postalCode"]', '75019')
    await page.inst('input[name="ppw-phoneNumber"]', '06' + rand(89, 10) + rand(89, 10) + rand(89, 10) + rand(89, 10))
    await page.clk('input.a-button-input')
    await page.clk('input.a-button-input')
    await page.clk('#confirm-button a')

    if (!i) {
      await page.clk('#HAWKFIRE_FAMILY_MONTHLY_RADIO_BUTTON')
      await page.clk('input.a-button-input')
    }

    create(true)
  }

  await create()
}

main()