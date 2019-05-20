process.setMaxListeners(0)

var fs = require('fs');
const puppet = require('./puppet')
const request = require('ajax-request');
var shell = require('shelljs');
var socket = require('socket.io-client')('https://online-music.herokuapp.com');
const image2base64 = require('image-to-base64');
const captcha = require('./captcha')

let streamId
let streamOn = false
let stream
let maxStream = 10
let countStream = 0
let close = false
let albums

const account = process.env.ACCOUNT
const check = process.env.CHECK
const clientId = process.env.CLIENTID

const accountInfo = account.split(':')
const player = accountInfo[0]
const login = accountInfo[1]
const pass = accountInfo[2]

let over = false
let page

const getTime = () => {
  const date = new Date
  return date.getUTCHours() + 1 + 'H' + date.getUTCMinutes()
}

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

socket.on('activate', id => {
  if (!streamId) { streamId = id }
  socket.emit('runner', { clientId, account, id: streamId, player })
})

let ok
socket.on('albums', albs => {
  if (ok) { return }
  ok = true
  albums = albs
  fct()
})

const fct = async () => {
  let currentAlbum

  const album = () => {
    let albumUrl = albums[rand(albums.length)]
    while (currentAlbum === albumUrl) {
      albumUrl = albums[rand(albums.length)]
    }
    currentAlbum = albumUrl
    return albumUrl
  }

  const exit = async (code = 0) => {
    close = true
    page && await page.cls(true)

    socket.emit('Cdisconnect', account)

    process.exit(code)
  }

  const logError = (e) => {
    socket.emit('log', account + ' => ' + e)
  }

  process.on('SIGINT', function (code) {
    over = true
    console.log('exit')
    logError('exit')
    exit(100)
  });

  socket.on('streamOn', () => {
    countStream = 0
    streamOn = true
    stream()
  })

  socket.on('streamOff', () => {
    streamOn = false
  })

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

  let usernameInput = true
  let connected = false
  let suppressed = false

  let noCache = player === 'napster' || player === 'spotify'

  if (noCache) {
    shell.exec('rm -Rf save/' + player + '_' + login, { silent: true })
  }

  page = await puppet('save/' + player + '_' + login, noCache)

  if (!page) {
    close = true
    exit(50)
  }

  page.on('close', function (err) {
    if (!close) {
      exit(0)
    }
  });

  // page.on('console', msg => {
  //   for (let i = 0; i < msg.args().length; ++i)
  //     logError(`${account} => ${i}: ${msg.args()[i]}`)
  // });

  const takeScreenshot = async (name, e) => {
    let img

    try {
      await page.screenshot({ path: name + '_' + account + '.png' });
      img = await image2base64(name + '_' + account + '.png')
    }
    catch (e) { }

    socket.emit('screen', { errorMsg: e, account, streamOn, streamId, img, log: account + ' => ' + (e || name) })
  }

  stream = async () => {
    await takeScreenshot('stream')
    await page.waitFor(3000)

    if (++countStream > maxStream) {
      streamOn = false
    }

    if (streamOn) { stream() }
  }

  socket.on('runScript', async (scriptText) => {
    await page.evaluate(scriptText)
  })

  const catchFct = async (e) => {
    close = true

    let code = 5
    code = e === 'loop' ? 1 : code
    code = e === 'used' ? 1 : code
    code = e === 'first play' ? 2 : code
    code = e === 'failedLoop' ? 2 : code
    code = e === 'del' ? 4 : code

    // code = e === 'tidal not log' ? 3 : code
    // code = e === 'retry' ? 5 : code
    // code = e === 'crashed' ? 6 : code
    // code = e === 'error' ? 7 : code
    // code = e === 'fillForm' ? 5 : code
    // code = e === 'login' ? 9 : code
    // code = e === 'no bar' ? 10 : code
    // code = e === 'check' ? 12 : code

    if (code === 1) {
      socket.emit('retryOk')
    }

    if (code !== 1) {
      logError(e)
      console.log(getTime() + " ERR ", account, e)
      await takeScreenshot('throw', e)
    }

    if (player === "spotify") {
      if (code === 2) {
        await page.gotoUrl('https://accounts.spotify.com/revoke_sessions', true)
      }
      await page.gotoUrl('https://spotify.com/logout', true)
    }

    if (code === 4) {
      // 4 = DEL
      socket.emit('delete', account)

      fs.readFile('napsterAccountDel.txt', 'utf8', function (err, data) {
        if (err) return console.log(err);
        data = data.split(',').filter(e => e)
        if (data.indexOf(account) < 0) { data.push(account) }
        fs.writeFile('napsterAccountDel.txt', data.length === 1 ? data[0] : data.join(','), function (err) {
          if (err) return console.log(err);
        });
      });
    }
    else {
      socket.emit('loop', { errorMsg: e, account })
    }

    exit(code)
  }

  try {
    if (player === 'napster') {
      url = 'https://app.napster.com/login/'
      loggedDom = '.nav-settings'

      username = '#username'
      password = '#password'
      loginBtn = '.signin'
      loginError = '.login-error'

      playBtn = '.track-list-header .shuffle-button'
      repeatBtn = '.repeat-button'
      repeatBtnOk = '.repeat-button.repeat'
      nextBtn = '.player-advance-button.icon-next2'

      usedDom = '.player-error-box'

      timeLine = 'span.ui-slider-handle'
      style = 'left'
    }
    if (player === 'amazon') {
      url = 'https://music.amazon.fr/gp/dmusic/cloudplayer/forceSignIn'
      loggedDom = '.actionSection.settings'

      username = '#ap_email'
      password = '#ap_password'
      remember = '[name="rememberMe"]'
      loginBtn = '#signInSubmit'

      playBtn = '.playerIconPlayRing'
      pauseBtn = '.playerIconPauseRing'
      shuffleBtn = '.shuffleButton:not(.on)'
      repeatBtn = '.repeatButton:not(.on)'
      nextBtn = '.nextButton'

      usedDom = '.concurrentStreamsPopover'

      timeLine = '.scrubberBackground'
      style = 'width'
    }
    if (player === 'tidal') {
      url = 'https://listen.tidal.com/'
      loggedDom = '[class*="userLoggedIn"]'

      username = 'input#email'
      password = '[name="password"]'
      loginBtn = '.login-cta'
      goToLogin = '#sidebar section button + button'
      loginError = '.box-error'

      playBtn = '[class*="controls"] button + button'
      pauseBtn = '.playerIconPauseRing'
      repeatBtn = '[class*="repeatButton"]'
      repeatBtnOk = '[class*="repeatStateIcon"][class*="all"]'
      nextBtn = '[data-test="next"]'

      keyCaptcha = '6Lf-ty8UAAAAAE5YTgJXsS3B-frcWP41G15z-Va2'

      usedDom = '.WARN'
      reLog = 'body > div > div.main > div > div > div > div > div > button'

      timeLine = '[class*="fillingBlock"] > div:first-child'
      style = 'transform'
    }
    if (player === 'spotify') {
      url = 'https://accounts.spotify.com/login'
      loggedDom = '.sessionInfo'

      username = '#login-username'
      password = '#login-password'
      loginBtn = '#login-button'
      loginError = '.alert.alert-warning'

      playBtn = '.tracklist-play-pause.tracklist-middle-align'
      repeatBtn = '[class*="spoticon-repeat"]'
      repeatBtnOk = '.spoticon-repeat-16.control-button--active'
      shuffleBtn = '.spoticon-shuffle-16:not(.control-button--active)'
      nextBtn = '.spoticon-skip-forward-16'

      keyCaptcha = '6LeIZkQUAAAAANoHuYD1qz5bV_ANGCJ7n7OAW3mo'

      usedDom = '.ConnectBar'

      timeLine = '.progress-bar__fg'
      style = 'transform'
    }

    // ***************************************************************************************************************************************************************
    // *************************************************************************** CONNECT ***************************************************************************
    // ***************************************************************************************************************************************************************
    let tidalCaptcha

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
          tidalCaptcha = true

          let tryTidal
          const waitForPassword = async () => {
            try {
              await captcha(page, url, keyCaptcha, username, login)
              await page.inst(password, pass)
            }
            catch (e) {
              if (!tryTidal) {
                tryTidal = true
                await waitForPassword()
              }
              else {
                throw e
              }
            }
          }

          await waitForPassword()
          await page.clk('body > div > div > div > div > div > div > div > form > button', 'tidal connect')

          const logged = await page.wfs(loggedDom)
          if (!logged) { throw 'del' }
        }
      }
    }

    if (player === 'tidal') {
      await tidalConnect()
    }

    if (player === 'amazon') {
      await page.gotoUrl(album())
      connected = await page.ext(loggedDom)
    }

    if (!connected && player !== 'tidal') {
      await page.waitFor(2000 + rand(2000))
      await page.gotoUrl(url)

      if (player === 'amazon') {
        await page.jClk('a.cvf-widget-btn-verify-account-switcher')
        usernameInput = await page.ext(username)
      }

      if (usernameInput) {
        await page.inst(username, login)
      }

      await page.inst(password, pass)

      if (player !== 'amazon') {
        let loginFill = await page.get(username, 'value')
        let passFill = await page.get(password, 'value')

        if (!loginFill || !passFill) {
          await takeScreenshot('fillForm')
          await page.inst(username, login, true)
          await page.inst(password, pass, true)

          loginFill = await page.get(username, 'value')
          passFill = await page.get(password, 'value')

          if (!loginFill || !passFill) {
            throw 'fillForm'
          }
        }
      }

      await page.jClk(remember)
      await page.clk(loginBtn)

      await page.waitFor(2000 + rand(2000))
      suppressed = await page.get(loginError)

      if (suppressed) {
        if (player !== 'napster' || String(suppressed).match(/password/)) {
          throw 'del'
        }
        throw 'login'
      }
    }

    const spotCheck = async () => {
      try {
        const spotCheck = await page.np()
        await spotCheck.gotoUrl('https://www.spotify.com/en/account/overview')
        const productName = await spotCheck.get('.product-name')
        if (String(productName).match(/Free|free/)) { throw 'del' }

        await spotCheck.close()
      }
      catch (e) {
        console.log(e)
        throw 'check'
      }
    }

    if (player === 'spotify') {
      spotCheck()
      await page.gotoUrl(album())
    }
    else if (player === 'napster') {
      const issueAccount = await page.ext('.account-issue')
      const issueRadio = await page.ext('.unradio')
      if (issueAccount || issueRadio) { throw 'del' }
      // const reload = await page.ext('#main-container .not-found')
      await page.gotoUrl(album())
    }
    else if (player === 'amazon') {
      const waitForLogged = async () => {
        try {
          await page.wfs(loggedDom, true)
        }
        catch (e) {
          await waitForLogged()
        }
      }

      await waitForLogged()

      if (!connected) {
        await page.gotoUrl(album())
      }
    }

    // ***************************************************************************************************************************************************************
    // *************************************************************************** PLAY ******************************************************************************
    // ***************************************************************************************************************************************************************

    if (player === 'spotify') {
      await page.waitFor(2000 + rand(2000))
      const check1 = await page.ext(usedDom)
      const check2 = await page.ext('.Root__now-playing-bar .control-button.spoticon-pause-16.control-button--circled')
      if (check1 && check2) { throw 'used' }

      // const currentUA = await page.evaluate(() => {
      //   return navigator.userAgent
      // })
      // const ua = '--user-agent=Mozilla/5.0 (Linux; Android 4.0.4; Galaxy Nexus Build/IMM76B) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.133 Mobile Safari/535.19'

      // const spotErr = await page.get('.ErrorPage__inner', 'innerText')
      // if (String(spotErr).match(/limit/)) {
      //   await takeScreenshot('firstPlay')
      //   await page.setUserAgent(ua)
      //   await page.gotoUrl(album())
      //   await page.clk('.play-pause.middle-align')
      //   takeScreenshot('mobile')
      //   await page.waitFor(1000 * 45)
      //   await page.setUserAgent(currentUA)
      //   await page.gotoUrl(album())
      // }
    }

    let trys = 0
    const waitForPlayBtn = async () => {
      try {
        await page.clk(playBtn, 'first play')
        socket.emit('retryOk')
      }
      catch (e) {
        if (++trys >= 3) { catchFct(e) }
        await page.gotoUrl(album())
        await waitForPlayBtn()
      }
    }

    // await waitForPlayBtn()
    socket.emit('player', clientId)
    await page.clk(playBtn, 'first play')

    if (player === 'tidal') {
      const delTidal = await page.get('.ReactModal__Overlay', 'innerText')
      if (String(delTidal).match(/expired/)) {
        throw 'del'
      }
    }

    if (tidalCaptcha) {
      await page.waitFor(1000 * 60 * 2)
      await page.gotoUrl(album())
      await page.clk(playBtn, 'tidalPush')
      shell.exec('git add save/tidal_' + login + ' && git commit -m "add tidal account"')
    }

    if (check) {
      await page.waitFor(1000 * 60)
      throw 'loop'
    }

    // ***************************************************************************************************************************************************************
    // *************************************************************************** LOOP ******************************************************************************
    // ***************************************************************************************************************************************************************

    let t1
    let t2
    let freeze = 0
    let used
    let retry = false
    let retryDom = false
    let nextMusic = false
    let startLoop = false
    let exitLoop = false

    const loop = async () => {
      const existRepeatBtnOk = await page.ext(repeatBtnOk)

      if (!existRepeatBtnOk || !repeatBtnOk) {
        await page.jClk(repeatBtn)
      }

      await page.jClk(shuffleBtn)

      used = await page.ext(usedDom)

      try {
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

        t1 = await page.getTime(timeLine, style)
        await page.waitFor(1000 * 10)
        t2 = await page.getTime(timeLine, style)

        let matchTime = t1 && t1.match(/\d*\.\d*/)
        matchTime = matchTime ? matchTime[0] : null

        if (matchTime) {
          if (player === 'tidal') { matchTime = Number(matchTime) / 730 * 100 }
          if (Number(matchTime) > 50) {
            if (rand(7) < 1) {
              await page.jClk(nextBtn)
              socket.emit('plays', true)
            }
            if (!nextMusic) {
              nextMusic = true
              socket.emit('plays')
            }
            // logError(matchTime)
          }
          else {
            nextMusic = false
          }
        }

        if (t1 === t2) { ++freeze }
        else {
          freeze = 0
          retry = false
          retryDom = false
          streamOn = false
          socket.emit('retryOk')
        }

        if (freeze > 3) {
          freeze = 0

          if (!t1) {
            throw 'no bar'
          }
          else if (player === 'napster') {
            await page.jClk('.player-play-button .icon-pause2')
            await page.jClk('.player-play-button .icon-play-button')
            await page.waitFor(1000 * 15)

            t1 = await page.getTime(timeLine, style)

            if (t1 === '0%') {
              retry = true
            }
          }
          else {
            // throw 'failedLoop'
            await page.wfs(loggedDom, true)
            await page.waitFor(1000 * 5)
            if ((player === 'tidal' && rand(2)) || player !== 'tidal') {
              await page.gotoUrl(album())
            }
            await page.clk(playBtn, 'failedLoop')
            socket.emit('retryOk')
            retry = true
          }

          if (retry && !retryDom) {
            retryDom = true
            await takeScreenshot('retry')
          }
        }

        // socket.emit('stayAlive')
        if (exitLoop) { throw 'loop' }
        loop()
      }
      catch (e) {
        catchFct(e)
      }
    }

    loop()

    socket.on('out', async () => {
      exitLoop = true
    })
  }
  catch (e) {
    catchFct(e)
  }
}
