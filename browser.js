const puppet = require('./puppet')
var shell = require('shelljs');
const request = require('ajax-request');

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const getEmail = async () => {
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

  return 'mm' + mail
}

const mails = [
  '@musicsmix.club',
  // '@mega.zik.dj',
  // '@nospam.ze.tc',
  // '@speed.1s.fr',
  // '@cool.fr.nf',
]
let count = 0

shell.exec('expressvpn disconnect', { silent: true })
shell.exec('expressvpn connect fr', { silent: true })

const waitFor = async (p, mail, isCode, loop = null) => {
  let code
  let url
  const currentPage = loop || await mailPage.np()

  try {
    await currentPage.waitFor(1000 * 10 + rand(2000))

    const lookForCode = await p.ext('input[name="code"]')
    if (isCode && !lookForCode) { throw 'fail' }

    await currentPage.gotoUrl('https://webmail.gandi.net/roundcube/')
    await currentPage.bringToFront()

    await currentPage.inst('#quicksearchbox', mail, true)
    const getChecked = await currentPage.get('#s_mod_to', 'checked')
    if (!getChecked) { await currentPage.clk('#s_mod_to') }
    await currentPage.clk('#s_scope_all')
    await currentPage.select('#messagessearchfilter', 'UNSEEN')

    const isMail = await currentPage.jClk('#messagelist tbody tr a')

    if (isMail) {
      if (isCode) {
        code = await currentPage.get('.otp', 'innerText')

        if (code && code !== 'undefined') {
          console.log('code ok ' + code)
          await currentPage.clk('.button.delete')

          await p.bringToFront()
          await p.inst('input[name="code"]', code)
          await p.clk('input[type="submit"]')

          await currentPage.cls()
          return true
        }
        else {
          console.log('code not ok')
        }
      }
      else {
        url = await currentPage.get('#messagebody a', 'href')

        if (url && url !== 'undefined') {
          console.log('url ok')
          await currentPage.clk('.button.delete')

          await p.gotoUrl(url)

          await currentPage.cls()
          return true
        }
        else {
          console.log('url not ok')
        }
      }
    }
    else if (isCode) {
      await p.jClk('a.cvf-widget-link-resend')
    }

    throw 'fail'
  }
  catch (e) {
    console.log(e)
    await waitFor(p, mail, isCode, currentPage)
  }
}

const main = async () => {
  const mainPage = await puppet('', true)
  const mailPage = await puppet('', true)

  await mailPage.gotoUrl('https://webmail.gandi.net/roundcube/')
  const needLog = await mailPage.ext('#rcmloginsubmit')

  if (needLog) {
    await mailPage.inst('#rcmloginuser', 'micromike@musicsmix.club', true)
    await mailPage.inst('#rcmloginpwd', '055625f7430', true)
    await mailPage.clk('#rcmloginsubmit')
  }

  const create = async (i = null) => {
    const mail = await getEmail()
    const email = mail + mails[rand(mails.length)]

    if (i) {
      await mainPage.rload()
      const notfull = await mainPage.ext('#enterEmail:not(.hide)')
      // if (!notfull) { return process.exit() }
    }

    shell.exec('rm -Rf save/amazon_' + email, { silent: true })

    const page = !i ? mainPage : await puppet('save/amazon_' + email)
    // const mailPage = await page.np()

    await page.gotoUrl('https://music.amazon.fr/home')
    // await mailPage.gotoUrl('http://yopmail.com/')

    try {
      await page.clk('.createAccountLink')
    }
    catch (e) {
      await page.clk('.signIn')
      await page.clk('.createAccountLink')
    }

    // await mailPage.inst('.scpt', mail)
    // await mailPage.clk('.sbut')

    console.log(email)

    await page.inst('input#ap_customer_name', mail)
    await page.inst('input#ap_email', email)
    await page.inst('input#ap_password', '20192019')
    await page.inst('input#ap_password_check', '20192019')
    await page.clk('#continue')

    await page.waitFor(2000 + rand(2000))

    const lock = await page.ext('input#ap_customer_name')

    if (lock) {
      await page.inst('input#ap_password', '20192019')
      await page.inst('input#ap_password_check', '20192019')
    }

    await page.waitFor(2000 + rand(2000))
    await waitFor(page, mail, true)

    if (i) {
      await mainPage.inst('#enterEmail', email)
      await mainPage.inst('#confirmEmail', email)
      await mainPage.clk('input.a-button-input')

      if (++count <= 5) {
        create(true)
      }

      await waitFor(page, mail)
    }
    else {
      await page.clk('.buttonOption')
    }

    if (i) {
      // await page.inst('input#ap_email', email, false, true)
      await page.inst('input#ap_password', '20192019', false, true)
      await page.jClk('#signInSubmit')
    }
    else {
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

    // await waitForSelect()

    if (!i) {
      await page.inst('input[name="ppw-fullName"]', mail)
      await page.inst('input[name="ppw-line1"]', rand(50, 1) + ' rue de paris')
      await page.inst('input[name="ppw-city"]', 'Paris')
      await page.inst('input[name="ppw-stateOrRegion"]', 'Paris')
      await page.inst('input[name="ppw-postalCode"]', '75019')
      await page.inst('input[name="ppw-phoneNumber"]', '06' + rand(89, 10) + rand(89, 10) + rand(89, 10) + rand(89, 10))
      await page.clk('input.a-button-input')
      await page.clk('input.a-button-input')

      await page.clk('#HAWKFIRE_FAMILY_MONTHLY_RADIO_BUTTON')
      await page.clk('input.a-button-input')
      await page.waitFor(5000 + rand(2000))
      await page.gotoUrl('https://www.amazon.fr/music/settings')
      await page.clk('#familyManagementLink')
      await page.waitFor(5000 + rand(2000))
    }
    else {
      const waitForContinue = async () => {
        try {
          const ext1 = await page.ext('#ap-account-fixup-phone-skip-link')
          const ext2 = await page.ext('input#address-ui-widgets-enterAddressFullName')

          if (!ext1 && !ext2) { throw 'Failed' }
        }
        catch (e) {
          await waitForContinue()
        }
      }

      await waitForContinue()

      await page.jClk('#ap-account-fixup-phone-skip-link')

      await page.inst('input#address-ui-widgets-enterAddressFullName', mail)
      await page.inst('input#address-ui-widgets-enterAddressLine1', rand(50, 1) + ' rue de paris')
      await page.inst('input#address-ui-widgets-enterAddressCity', 'Paris')
      await page.inst('input#address-ui-widgets-enterAddressStateOrRegion', 'Paris')
      await page.inst('input#address-ui-widgets-enterAddressPostalCode', '75020')
      await page.inst('input#address-ui-widgets-enterAddressPhoneNumber', '06' + rand(89, 10) + rand(89, 10) + rand(89, 10) + rand(89, 10))
      await page.clk('input.a-button-input')
      await page.clk('input[name="address-ui-widgets-saveOriginalOrSuggestedAddress"]')
      await page.clk('#confirm-button a')
      await page.waitFor(5000 + rand(2000))
      await page.clk('input.a-button-input')

      try {
        // await page.clk('.dialogBox button')

        // await page.inst(password, pass)
        // await page.clk('input.a-button-input')

        // await page.clk('input.a-button-input')
        // await page.clk('.a-button-inner a')
      }
      catch (e) { console.log(e) }
    }

    request('https://online-music.herokuapp.com/addAccount?amazon:' + email + ':20192019', function (error, response, body) {
      shell.exec('git add save/amazon_' + email + ' && git commit -m "add account" && git push')
      if (!i) { create(true) }
    })
  }

  await create()
}

main()