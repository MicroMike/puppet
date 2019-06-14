const puppet = require('./puppet')
var shell = require('shelljs');

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const getEmail = async (i) => {
  const MP = await puppet('', true, true)
  await MP.gotoUrl('https://temp-mail.org/option/delete/')
  let M = await MP.get('#mail', 'value')
  M = M.split('@')[0]
  await MP.cls()
  return M + i
}

const main = async () => {
  shell.exec('expressvpn disconnect', { silent: true })
  shell.exec('expressvpn connect uswd')

  const create = async (i = '') => {
    const page = await puppet('', true, true)
    await page.gotoUrl('https://music.amazon.fr/home')
    await page.clk('.createAccountLink')

    let mailPage = await page.np()
    const mail = await getEmail(i)
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

        url = !isCode && await mailPage.evaluate(() => {
          const iframe = document.querySelector('#ifmail')
          const link = iframe && iframe.contentDocument.querySelector('table tr td a')
          const url = link && link.href

          return url
        })

        if ((isCode && !code) || (!isCode && !url)) { throw 'fail' }
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

    await waitFor()

    await page.gotoUrl(url)
    await page.inst('input#ap_password', '20192019')
    await page.clk('#signInSubmit')

    await page.waitFor(2000 + rand(2000))

    await page.select('select#address-ui-widgets-countryCode-dropdown-nativeId', 'US')
    await page.waitFor(2000 + rand(2000))

    await page.inst('input#address-ui-widgets-enterAddressFullName', mail)
    await page.inst('input#address-ui-widgets-enterAddressLine1', rand(50, 1) + ' ' + rand(10, 1) + ' avenue')
    await page.inst('input#address-ui-widgets-enterAddressCity', 'New-York')
    await page.inst('input#address-ui-widgets-enterAddressStateOrRegion', 'New-York')
    await page.inst('input#address-ui-widgets-enterAddressPostalCode', '10001')
    await page.inst('input#address-ui-widgets-enterAddressPhoneNumber', '06' + rand(89, 10) + rand(89, 10) + rand(89, 10) + rand(89, 10))
    await page.clk('input.a-button-input')
    await page.clk('input[name="address-ui-widgets-saveOriginalOrSuggestedAddress"]')
    await page.clk('#confirm-button a')
  }

  await create()

  let time = 0
  for (let i of 'abcde') {
    setTimeout(() => {
      create(i)
    }, 1000 * 5 * (time++));
  }
}

main()