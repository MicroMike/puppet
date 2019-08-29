const request = require('ajax-request');
const shell = require('shelljs');
const image2base64 = require('image-to-base64');
const captcha = require('./captcha')

module.exports = async (page, socket, parentId, streamId, env, account) => {
  const accountInfo = account.split(':')
  let player = accountInfo[0]
  let login = accountInfo[1]
  let pass = accountInfo[2]

  const al = require('./albums')
  let albums = al[player]

  const check = env.CHECK

  const socketEmit = (event, params) => {
    socket.emit(event, {
      parentId,
      streamId,
      account,
      ...params,
    })
  }

  let close = false
  let trys = 0

  const getTime = () => {
    const date = new Date
    return date.getUTCHours() + 1 + 'H' + date.getUTCMinutes()
  }

  const rand = (max, min) => {
    return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
  }

  const exit = async () => {
    close = true

    try { await page.cls(true) }
    catch (e) { }

    socket.emit('Cdisconnect', streamId)
  }

  const takeScreenshot = async (name) => {
    let img

    try {
      await pages[streamId].screenshot({ path: name + '_' + account + '.png' });
      img = await image2base64(name + '_' + account + '.png')
    }
    catch (e) { }

    socketEmit('screen', { img, log: account + ' => ' + name })
  }

  let currentAlbum

  const album = () => {
    let albumUrl = albums[rand(albums.length)]
    while (currentAlbum === albumUrl) {
      albumUrl = albums[rand(albums.length)]
    }
    currentAlbum = albumUrl
    return albumUrl
  }

  const logError = (e) => {
    socket.emit('log', account + ' => ' + e)
  }

  let username
  let password
  let url
  let remember
  let loginBtn
  let playBtn
  let nextBtn
  let pauseBtn
  let shuffleBtn
  let repeatBtn
  let repeatBtnOk
  let loggedDom
  let goToLogin
  let keyCaptcha
  let usedDom
  let reLog
  let loginError
  let timeLine
  let style
  let callback
  let unlock1
  let unlock2
  let freezeConnect

  let usernameInput = true
  let connected = false
  let suppressed = false

  let noCache = player === 'napster' || player === 'spotify'

  if (noCache || check) {
    shell.exec('rm -Rf save/' + player + '_' + login, { silent: true })
  }

  freezeConnect = setTimeout(() => {
    exit()
  }, 1000 * 60 * 3);

  socketEmit('playerInfos', { account: player + ':' + login, time: 'RUN', other: true })

  page.on('close', function (err) {
    if (!close && !check) {
      exit()
    }
  });

  // page.on('console', msg => {
  //   for (let i = 0; i < msg.args().length; ++i)
  //     logError(`${account} => ${i}: ${msg.args()[i]}`)
  // });

  const catchFct = async (e) => {
    close = true

    let code = 5

    code = e === 'loop' ? 1 : code
    code = e === 'firstPlay' ? 210 : code
    code = e === 'failedLoop' ? 210 : code
    code = e === 'failedTime' ? 210 : code
    code = e === 'del' ? 4 : code
    code = e === 'tidalError' ? 6 : code
    code = e === 'amazonError' ? 6 : code
    code = e === 'used' ? 7 : code
    code = e === 'freeze' ? 1 : code

    // code = e === 'retry' ? 5 : code
    // code = e === 'crashed' ? 6 : code
    // code = e === 'error' ? 7 : code
    // code = e === 'fillForm' ? 5 : code
    // code = e === 'login' ? 9 : code
    // code = e === 'nobar' ? 10 : code
    // code = e === 'check' ? 12 : code

    if (code === 1) {
      socketEmit('retryOk')
    }

    if (code === 6) {
      request('https://online-music.herokuapp.com/error?check/' + account, function (error, response, body) { })
    }

    if (code !== 1) {
      socket.emit('outLog', e)
      logError(e)
      console.log(getTime() + " ERR ", account, e)
      await takeScreenshot(e)
    }

    // if (player === "spotify") {
    //   if (code === 2) {
    //     await page.gotoUrl('https://accounts.spotify.com/revoke_sessions', true)
    //   }
    //   await page.gotoUrl('https://spotify.com/logout', true)
    // }

    if (code === 4) {
      request('https://online-music.herokuapp.com/error?del/' + account, function (error, response, body) { })
    }
    else if (code === 7) {
      socket.emit('used', account)
    }

    exit()
  }

  try {
    if (player === 'napster') {
      url = 'https://micro-napster.herokuapp.com/'
      loggedDom = '#track .content'

      username = '#username'
      password = '#password'
      loginBtn = '.sign-in-btn.button'
      loginError = '.login-error'

      unlock1 = '.player-btn[title="Next Song"]'
      playBtn = '#track .content'
      shuffleBtn = '.player-btn[title="Shuffle"]'
      // repeatBtn = '.repeat-button'
      // repeatBtnOk = '.repeat-button.repeat'
      nextBtn = '.player-btn[title="Next Song"]'

      usedDom = '.player-error-box'

      timeLine = '.demobox > div.text'
      callback = a => (a.split('/')[0].split(':').reduce((a, b) => a * 60 + Number(b)))
    }
    if (player === 'amazon') {
      url = 'https://music.amazon.fr/gp/dmusic/cloudplayer/forceSignIn'
      loggedDom = '.actionSection.settings'

      username = '#ap_email'
      password = '#ap_password'
      remember = '[name="rememberMe"]'
      loginBtn = '#signInSubmit'
      loginError = '.upsellButton'

      playBtn = '.playerIconPlayRing'
      pauseBtn = '.playerIconPauseRing'
      shuffleBtn = '.playbackControlsView .shuffleButton:not(.on)'
      repeatBtn = '.repeatButton:not(.on)'
      nextBtn = '.nextButton'

      usedDom = '.concurrentStreamsPopover'

      timeLine = '.listViewDuration'
      callback = a => (100 - a.split(':').reduce((a, b) => Math.abs(a * 60) + Number(b)))
    }
    if (player === 'tidal') {
      url = 'https://listen.tidal.com/'
      loggedDom = '[class*="userLoggedIn"]'

      username = 'input#email'
      password = '[name="password"]'
      loginBtn = '.login-cta'
      goToLogin = '#sidebar section button + button'
      loginError = '.box-error'

      unlock1 = '[class*="playbackToggle"]'
      unlock2 = '[class*="playbackToggle"]'
      playBtn = 'main [data-test="header-controls"] button + button'
      pauseBtn = '.playerIconPauseRing'
      repeatBtn = '[class*="repeatButton"]'
      repeatBtnOk = '[class*="repeatStateIcon"][class*="all"]'
      nextBtn = '[data-test="next"]'

      keyCaptcha = '6Lf-ty8UAAAAAE5YTgJXsS3B-frcWP41G15z-Va2'

      usedDom = '.WARN'
      reLog = 'body > div > div.main > div > div > div > div > div > button'

      timeLine = '[class*="currentTime"]'
      callback = a => (a.split(':').reduce((a, b) => a * 60 + Number(b)))
    }
    if (player === 'spotify') {
      url = 'https://accounts.spotify.com/login'
      loggedDom = '.sessionInfo'

      username = '#login-username'
      password = '#login-password'
      loginBtn = '#login-button'
      loginError = '.alert.alert-warning'

      unlock1 = '.spoticon-pause-16'
      unlock2 = '.spoticon-play-16'
      playBtn = '.main-view-container button'
      repeatBtn = '[class*="spoticon-repeat"]'
      repeatBtnOk = '.spoticon-repeat-16.control-button--active'
      shuffleBtn = '.spoticon-shuffle-16:not(.control-button--active)'
      nextBtn = '.spoticon-skip-forward-16'

      keyCaptcha = '6LeIZkQUAAAAANoHuYD1qz5bV_ANGCJ7n7OAW3mo'

      usedDom = '.ConnectBar'

      timeLine = '.playback-bar__progress-time'
      callback = a => (a.split(':').reduce((a, b) => a * 60 + Number(b)))
    }

    // ***************************************************************************************************************************************************************
    // *************************************************************************** CONNECT ***************************************************************************
    // ***************************************************************************************************************************************************************

    const napsterCheck = async () => {
      const issueAccount = await page.ext('#del')
      if (issueAccount) { throw 'del' }
    }

    const tidalConnect = async () => {
      let notConnected = true

      await page.gotoUrl(album())
      notConnected = await page.jClk(goToLogin)

      if (notConnected) {

        const tryClick = async () => {
          const done = await page.jClk(reLog, true)
          const existInput = await page.ext(username)

          if (!done && !existInput) {
            await tryClick()
          }

          return existInput
        }

        const needLog = await tryClick()

        if (needLog) {
          if (!check) { throw 'tidalError' }

          try {
            await page.inst(username, login, true)
            await page.clk('#recap-invisible')

            await page.waitFor(5000 + rand(2000))

            const exist = await page.ext(password)
            if (!exist) { throw 'fail' }
          }
          catch (e) {
            await captcha(page, url, keyCaptcha, username, login)
          }

          const waitForPass = async () => {
            try {
              const exist = await page.ext(password)
              if (!exist) { throw 'failed' }
            }
            catch (e) {
              await waitForPass()
            }
          }

          await waitForPass()
          await page.inst(password, pass, true)
          await page.clk('body > div > div > div > div > div > div > div > form > button', 'tidal connect')

          const logged = await page.wfs(loggedDom)
          if (!logged) { throw 'del' }
        }
      }
    }

    const checkFill = async () => {
      if (player === 'amazon') {
        await page.jClk('a.cvf-widget-btn-verify-account-switcher')
        usernameInput = await page.ext(username)
      }

      if (usernameInput) {
        await page.inst(username, login)
      }

      await page.inst(password, pass)

      let loginFill = player === 'amazon' || await page.get(username, 'value')
      let passFill = await page.get(password, 'value')

      if (!loginFill || !passFill) {
        await takeScreenshot('fillForm')
        await checkFill()
      }
      else {
        socketEmit('retryOk')
      }
    }

    const spotCheck = async () => {
      const spotCheck = await page.np()
      await spotCheck.gotoUrl('https://www.spotify.com/en/account/overview')
      const productName = await spotCheck.get('.product-name')
      if (String(productName).match(/Free|free/)) { throw 'del' }

      await spotCheck.close()
    }

    const amazonCheck = async () => {
      const needContinue = await page.jClk('#continue')

      if (needContinue) {
        check && clearTimeout(freezeConnect)

        try {
          let code
          const waitForCode = async () => {
            let inbox
            try {
              inbox = (shell.exec('yogo_linux_amd64 inbox show ' + login.split('@')[0] + ' 1', { silent: true })).stdout

              code = inbox.split('suivant')[1] && inbox.split('rification')[1].split('Ce code')[0].replace(':', '').trim()

              if (!code) { throw 'fail' }
            }
            catch (e) {
              // check && console.log(inbox, login.split('@')[0], e)
              await page.waitFor(1000 * 3 + rand(2000))
              await waitForCode()
            }
          }

          await waitForCode()

          await page.inst('input[name="code"]', code)
          await page.clk('input[type="submit"]')

          await page.jClk('#ap-account-fixup-phone-skip-link')
        }
        catch (e) {
          // check && console.log(e)
          throw 'amazonError'
        }
      }

      const del = await page.ext(loginError)
      if (del) { throw 'del' }
    }

    const connectFct = async () => {
      if (player === 'tidal') {
        await tidalConnect()
      }

      if (player === 'amazon') {
        await page.gotoUrl(album())
        connected = await page.ext(loggedDom)
        check && console.log('amazon: ' + connected)
      }

      if (!connected && player !== 'tidal') {
        await page.waitFor(2000 + rand(2000))
        await page.gotoUrl(url)

        await checkFill()

        await page.jClk(remember)
        await page.clk(loginBtn)

        if (player === 'napster') {
          const napsterAuth = async () => {
            try {
              await page.jClk('#confirm-authorize')
              await page.waitFor(2000 + rand(2000))

              const exist = await page.ext('#confirm-authorize')
              if (exist) { throw 'fail' }
            }
            catch (e) {
              await napsterAuth()
            }
          }

          await napsterAuth()
        }

        if (player === 'amazon') {
          const captchaAmazon = async () => {
            try {
              await page.jInst(password, pass)
              const ca = await page.ext('#auth-captcha-image')
              if (ca) { throw 'fail' }
            }
            catch (e) {
              await captchaAmazon()
            }
          }

          await captchaAmazon()

          await page.jClk('#ap-account-fixup-phone-skip-link')
        }

        await page.waitFor(2000 + rand(2000))
        // suppressed = await page.wfs(loginError, false)

        if (suppressed) {
          if (player !== 'napster' || String(suppressed).match(/password/)) {
            throw 'del'
          }
          throw 'login'
        }
      }

      if (player === 'spotify') {
        spotCheck()
        await page.gotoUrl(album())
      }
      else if (player === 'napster') {
        await napsterCheck()
        // const reload = await page.ext('#main-container .not-found')
      }
      else if (player === 'amazon') {
        await amazonCheck()
        const play = await page.ext(playBtn)
        !play && await page.gotoUrl(album())
      }
    }

    await connectFct()

    socketEmit('playerInfos', { account: player + ':' + login, time: 'CONNECT', other: true })

    clearTimeout(freezeConnect)

    // ***************************************************************************************************************************************************************
    // *************************************************************************** PLAY ******************************************************************************
    // ***************************************************************************************************************************************************************

    if (player === 'spotify') {
      await page.waitFor(2000 + rand(2000))
      const check1 = await page.ext(usedDom)
      const check2 = await page.ext('.Root__now-playing-bar .control-button.spoticon-pause-16.control-button--circled')
      if (check1 && check2) { throw 'used' }
    }

    const waitForPlayBtn = async (playError) => {
      let updateBtn
      try {
        if (player === 'tidal') {
          trys > 0 && await page.waitFor(1000 * 30 + rand(2000))

          updateBtn = await page.evaluate(() => {
            const update = document.querySelectorAll('button')
            update && update.forEach(b => b.innerText === 'Update' && update.click())
            return update
          })
          console.log('updateBtn', updateBtn)
        }

        await page.clk(playBtn)
        socketEmit('retryOk')
      }
      catch (e) {
        console.log(e)
        if (++trys > 3) {
          throw playError
        }

        if (player === 'amazon') {
          const waitForReady = async () => {
            const amazonStyle = await page.evaluate(() => {
              return document.querySelector('#mainContentLoadingSpinner').style['display']
            })

            if (amazonStyle !== 'none') {
              takeScreenshot('amazonFreeze')
              await page.waitFor(2000 + rand(2000))
              await waitForReady()
            }
          }

          await waitForReady()

          try { await page.clk(playBtn) }
          catch (e) {
            await page.rload()
            await waitForPlayBtn(playError)
          }
        }
        else if (!updateBtn) {
          await page.rload()

          const logged = await page.wfs(loggedDom)
          if (!logged) { throw 'logout' }

          await waitForPlayBtn(playError)
        }
      }
    }

    await waitForPlayBtn('firstPlay')
    // await page.clk(playBtn, 'firstPlay')
    socketEmit('playerInfos', { account: player + ':' + login, time: 'PLAY', ok: true })

    if (player === 'tidal') {
      const delTidal = await page.get('.ReactModal__Overlay', 'innerText')
      if (String(delTidal).match(/expired/)) {
        throw 'del'
      }
    }

    if (check) {
      request('https://online-music.herokuapp.com/checkOk?' + account, async (error, response, body) => {
        // startCheck()
        await page.waitFor(1000 * 35)
        shell.exec('git add save/' + player + '_' + login + ' && git commit -m "add account" && git push')
        await page.cls(true)

        catchFct('check')
      })
      return
    }

    // ***************************************************************************************************************************************************************
    // *************************************************************************** LOOP ******************************************************************************
    // ***************************************************************************************************************************************************************

    let t1
    let t2
    let freeze = 0
    let used
    let nextMusic = false
    let startLoop = false
    let exitLoop = false

    let countPlays = 0
    let changePlay = 30 + rand(30)
    let change = false
    let changeOnce = false

    const loop = async () => {
      try {
        const existRepeatBtnOk = await page.ext(repeatBtnOk)

        if (!existRepeatBtnOk || !repeatBtnOk) {
          await page.jClk(repeatBtn)
        }

        await page.jClk(shuffleBtn)

        used = await page.ext(usedDom)

        if (player === 'tidal') {
          const delTidal = await page.get('.ReactModal__Overlay', 'innerText')
          if (String(delTidal).match(/expired/)) {
            throw 'del'
          }
        }

        if (player === 'napster') { await napsterCheck() }

        if (used) {
          if (player === 'tidal') {
            used = await page.get(usedDom)
            used = String(used).match(/currently/) ? used : false

            if (!used) {
              await page.jClk('.WARN + div + button[data-test="notification-close"]')
            }
            else {
              throw 'used'
            }
          }
          else {
            throw 'used'
          }
        }

        t2 = t1
        t1 = await page.getTime(timeLine, callback)

        let matchTime = Number(t1)

        if (matchTime && matchTime > 30) {
          if (!nextMusic) {
            nextMusic = true
            countPlays++

            await page.jClk(nextBtn)
            socketEmit('plays', { next: true, currentAlbum })
          }
        }
        else {
          nextMusic = false
        }

        if (countPlays > changePlay) {
          exitLoop = true
        }

        if (t1 === t2) {
          ++freeze
          socketEmit('playerInfos', { account: player + ':' + login, time: t1, freeze: true, warn: true })
        }
        else {
          // if (freeze > 0) {
          socketEmit('playerInfos', { account: player + ':' + login, time: t1, ok: true })
          // }

          freeze = 0
          socketEmit('retryOk')
        }

        if (freeze) {
          socketEmit('playerInfos', { account: player + ':' + login, time: t1, freeze: true })

          if (player === 'napster') { await page.jClk(playBtn) }
          else { await page.jClk(nextBtn) }
          await page.waitFor(1000 * 5)

          const logged = await page.wfs(loggedDom)
          if (!logged) { throw 'logout' }
          else if (freeze > 5) { throw 'freeze' }
        }

        if (exitLoop) { throw 'loop' }
        else { loop() }
      }
      catch (e) {
        catchFct(e)
      }
    }

    loop()
  }
  catch (e) {
    catchFct(e)
  }
}
