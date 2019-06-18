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
let trys = 0

const check = process.env.CHECK
const clientId = process.env.CLIENTID
const time = process.env.TIME

let account
let player
let login
let pass
let page

let over = false

const getTime = () => {
  const date = new Date
  return date.getUTCHours() + 1 + 'H' + date.getUTCMinutes()
}

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

socket.on('activate', id => {
  if (!streamId) { streamId = id }
  socket.emit('runner', { clientId: check ? 'check' : clientId, time, id: streamId, env: process.env, account })
})

socket.on('streams', a => {
  account = a
  if (!account) { return process.exit(0) }

  const accountInfo = account.split(':')
  player = accountInfo[0]
  login = accountInfo[1]
  pass = accountInfo[2]

  request('https://online-accounts.herokuapp.com/albums', function (error, response, body) {
    const a = JSON.parse(body)
    albums = a[player]
    fct()
  })
})

const getCheckAccounts = async () => {
  return new Promise(res => {
    request('https://online-accounts.herokuapp.com/checkAccounts', function (error, response, body) {
      const CA = JSON.parse(body)
      res(CA)
    })
  })
}

let checkAccounts = null
const startCheck = async () => {
  checkAccounts = checkAccounts === null ? await getCheckAccounts() : checkAccounts
  account = checkAccounts && checkAccounts.length && checkAccounts.shift()

  if (account) {
    const accountInfo = account.split(':')
    player = accountInfo[0]
    login = accountInfo[1]
    pass = accountInfo[2]

    request('https://online-accounts.herokuapp.com/albums', function (error, response, body) {
      const a = JSON.parse(body)
      albums = a[player]
      fct()
    })
  }
}

if (check) { startCheck() }

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
  socket.emit('playerInfos', { account: player + ':' + login, out: true })

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

socket.on('forceOut', () => {
  over = true
  socket.emit('forceOut')
  console.log('forceOut')
  // logError('forceOut')
  exit(100)
})

socket.on('streamOn', () => {
  countStream = 0
  streamOn = true
  stream()
})

socket.on('streamOff', () => {
  streamOn = false
})

const fct = async () => {
  socket.emit('playerInfos', { account: player + ':' + login, time: 'STARTED', other: true })

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

  let usernameInput = true
  let connected = false
  let suppressed = false

  let noCache = player === 'napster' || player === 'spotify'

  if (noCache) {
    shell.exec('rm -Rf save/' + player + '_' + login, { silent: true })
  }

  page = await puppet('save/' + player + '_' + login, noCache, false)

  if (!page) {
    fct()
    return
  }

  page.on('close', function (err) {
    if (!close && !check) {
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

  socket.on('screenshot', async () => {
    await takeScreenshot('getScreen')
  })

  const catchFct = async (e) => {
    close = true

    let code = 5

    socket.emit('outLog', e)

    code = e === 'loop' ? 1 : code
    code = e === 'firstPlay' ? 2 : code
    code = e === 'failedLoop' ? 2 : code
    code = e === 'del' ? 4 : code
    code = e === 'tidalError' ? 6 : code
    code = e === 'used' ? 7 : code

    // code = e === 'retry' ? 5 : code
    // code = e === 'crashed' ? 6 : code
    // code = e === 'error' ? 7 : code
    // code = e === 'fillForm' ? 5 : code
    // code = e === 'login' ? 9 : code
    // code = e === 'nobar' ? 10 : code
    // code = e === 'check' ? 12 : code

    if (code === 1) {
      socket.emit('retryOk')
    }

    if (code === 6) {
      request('https://online-accounts.herokuapp.com/error?check/' + account, function (error, response, body) { })
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
      request('https://online-accounts.herokuapp.com/error?del/' + account, function (error, response, body) { })

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
      loggedDom = '.icon-settings2'

      username = '#username'
      password = '#password'
      loginBtn = '.signin'
      loginError = '.login-error'

      unlock1 = '.icon-pause2'
      unlock2 = '.icon-play-button'
      playBtn = '.track-list-header .shuffle-button'
      repeatBtn = '.repeat-button'
      repeatBtnOk = '.repeat-button.repeat'
      nextBtn = '.player-advance-button.icon-next2'

      usedDom = '.player-error-box'

      timeLine = '.player-time'
      callback = a => (a.split(' / ')[0].split(':').reduce((a, b) => a * 60 + Number(b)))
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

      timeLine = '.listViewDuration'
      callback = a => (70 - a.split(':').reduce((a, b) => Math.abs(a * 60) + Number(b)))
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
      playBtn = '[class*="controls"] button + button'
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
      const issueAccount = await page.ext('.account-issue')
      const issueRadio = await page.ext('.unradio')
      if (issueAccount || issueRadio) { throw 'del' }
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

          await captcha(page, url, keyCaptcha, username, login)

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
        socket.emit('retryOk')
      }
    }

    const spotCheck = async () => {
      const spotCheck = await page.np()
      await spotCheck.gotoUrl('https://www.spotify.com/en/account/overview')
      const productName = await spotCheck.get('.product-name')
      if (String(productName).match(/Free|free/)) { throw 'del' }

      await spotCheck.close()
    }

    const connectFct = async () => {
      try {
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

          await checkFill()

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

        if (player === 'spotify') {
          spotCheck()
          await page.gotoUrl(album())
        }
        else if (player === 'napster') {
          await napsterCheck()
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
      }
      catch (e) {
        catchFct(e)
      }
    }

    await connectFct()

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
      try {
        await page.clk(playBtn)
        socket.emit('retryOk')
      }
      catch (e) {
        if (++trys >= 3) {
          return catchFct('3trys/' + playError)
        }

        await takeScreenshot('try')

        const logged = await page.ext(loggedDom)
        if (logged) {
          await page.gotoUrl(album())
        }
        else {
          await connectFct()
        }

        await waitForPlayBtn(playError)
      }
    }

    socket.emit('player', clientId)
    socket.emit('playerInfos', { account: player + ':' + login, time: 'LOADING', other: true })
    await waitForPlayBtn('firstPlay')
    // await page.clk(playBtn, 'firstPlay')

    if (player === 'tidal') {
      const delTidal = await page.get('.ReactModal__Overlay', 'innerText')
      if (String(delTidal).match(/expired/)) {
        throw 'del'
      }
    }

    if (check) {
      request('https://online-accounts.herokuapp.com/checkOk?' + account, async (error, response, body) => {
        shell.exec('git add save/' + player + '_' + login + ' && git commit -m "add account"')
        startCheck()
        page.cls(true)
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
    let retry = false
    let retryDom = false
    let nextMusic = false
    let startLoop = false
    let exitLoop = false

    let countPlays = 0
    let changePlay = 15 + rand(15)

    const loop = async () => {
      if (player === 'tidal') {
        const delTidal = await page.get('.ReactModal__Overlay', 'innerText')
        if (String(delTidal).match(/expired/)) {
          throw 'del'
        }
      }

      const existRepeatBtnOk = await page.ext(repeatBtnOk)

      if (!existRepeatBtnOk || !repeatBtnOk) {
        await page.jClk(repeatBtn)
      }

      await page.jClk(shuffleBtn)

      used = await page.ext(usedDom)

      try {
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

        let a, b
        if (t1 === t2 && freeze > 0) {
          a = t1 + ' ' + t2
          await page.jClk(unlock1)
          await page.waitFor(1000 * 5)
          await page.jClk(unlock2)
          await page.waitFor(1000 * 5)
          t2 = await page.getTime(timeLine, callback)
        }
        else {
          t1 = await page.getTime(timeLine, callback)
          await page.waitFor(1000 * 10)
          t2 = await page.getTime(timeLine, callback)
        }

        b = t1 + ' ' + t2

        // a && logError(a + '/' + b)

        let matchTime = Number(t1)

        if (matchTime > 40) {
          if (rand(7) < 1) {
            await page.jClk(nextBtn)
            socket.emit('plays', true)
            // request('https://online-accounts.herokuapp.com/listen?' + currentAlbum, function (error, response, body) { })
          }
          if (!nextMusic) {
            nextMusic = true
            countPlays++
            socket.emit('plays')
            // request('https://online-accounts.herokuapp.com/listen?' + currentAlbum, function (error, response, body) { })
          }
        }
        else {
          nextMusic = false
        }

        if (countPlays > changePlay) {
          exitLoop = true
          // countPlays = 0
          // changePlay = 5 + rand(5)
          // await page.gotoUrl(album())
          // await waitForPlayBtn('failedLoop')
        }

        if (t1 === t2) {
          ++freeze
          socket.emit('playerInfos', { account: player + ':' + login, time: t1, freeze: true, warn: true })
        }
        else {
          freeze = 0
          retry = false
          retryDom = false
          streamOn = false
          socket.emit('playerInfos', { account: player + ':' + login, time: t1, ok: true })
          socket.emit('retryOk')
        }

        if (freeze > 1) {
          socket.emit('playerInfos', { account: player + ':' + login, time: t1, freeze: true })

          const logged = await page.ext(loggedDom)
          if (!logged) { throw 'logout' }
          else {
            await takeScreenshot('freeze')
          }
        }

        if (exitLoop) { throw 'loop' }
        else { loop() }
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
