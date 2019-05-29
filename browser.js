const puppet = require('./puppet')

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const main = async () => {
  const MP = await puppet('', true, true)
  await MP.gotoUrl('https://temp-mail.org/option/delete/')
  let M = await MP.get('#mail', 'value')
  M = M.split('@')[0]

  await MP.cls(true)

  const create = async (i) => {
    const page = await puppet('', true, true)
    await page.gotoUrl('https://music.amazon.fr/home')
    await page.clk('.createAccountLink')

    const mailPage = await page.np()
    await mailPage.gotoUrl('http://yopmail.com/')

    let mail = M + i
    let email = mail + '@mega.zik.dj'

    await mailPage.inst('.scpt', mail)
    await mailPage.clk('.sbut')

    await page.inst('input#ap_customer_name', mail)
    await page.inst('input#ap_email', email)
    await page.inst('input#ap_password', '20192019')
    await page.inst('input#ap_password_check', '20192019')
    await page.clk('#continue')

    await page.waitFor(5000 + rand(2000))

    await mailPage.clk('#lrefr')
    await mailPage.evaluate(() => {
      document.querySelector('#ifinbox').contentDocument.querySelector('#m1').click()
    })

    const nbMail = await mailPage.evaluate(() => {
      return document.querySelector('#ifinbox').contentDocument.querySelectorAll('.m').length
    })

    await page.waitFor(2000 + rand(2000))

    const code = await mailPage.evaluate(() => {
      return document.querySelector('#ifmail').contentDocument.querySelector('.otp').innerText
    })

    await page.inst('input[name="code"]', code)
    await page.clk('input[type="submit"]')

    const compare = async () => {
      await mailPage.clk('#lrefr')

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
      document.querySelector('#ifinbox').contentDocument.querySelector('#m1').click()
    })

    await page.waitFor(2000 + rand(2000))

    const url = await mailPage.evaluate(() => {
      return document.querySelector('#ifmail').contentDocument.querySelector('table tr td a').href
    })

    await page.gotoUrl(url)
    await page.inst('input#ap_password', '20192019')
    await page.clk('#signInSubmit')

    await page.inst('input#address-ui-widgets-enterAddressFullName', mail)
    await page.inst('input#address-ui-widgets-enterAddressLine1', '23 56st')
    await page.inst('input#address-ui-widgets-enterAddressCity', 'New-York')
    await page.inst('input#address-ui-widgets-enterAddressStateOrRegion', 'New-York')
    await page.inst('input#address-ui-widgets-enterAddressPostalCode', '10001')
    await page.inst('input#address-ui-widgets-enterAddressPhoneNumber', '0645789458')
    await page.clk('input.a-button-input')
    await page.clk('input[name="address-ui-widgets-saveOriginalOrSuggestedAddress"]')
    await page.clk('#confirm-button a')
  }

  for (let i of 'abc') {
    create(i)
  }
}

main()