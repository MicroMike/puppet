process.setMaxListeners(0)

const fs = require('fs');
const puppet = require('./puppet')
const request = require('ajax-request');
var shell = require('shelljs');
var socket = require('socket.io-client')('https://online-music.herokuapp.com');
const image2base64 = require('image-to-base64');
let streamId
let streamOn = false
let stream
let maxStream = 10
let countStream = 0

const account = process.env.ACCOUNT
const check = process.env.CHECK
const clientId = process.env.CLIENTID

socket.on('activate', id => {
  if (!streamId) { streamId = id }
  socket.emit('runner', { clientId, account, id: streamId })
})

socket.on('streamOn', () => {
  countStream = 0
  streamOn = true
  stream()
})

socket.on('streamOff', () => {
  streamOn = false
})

const disconnect = (code = 0) => {
  socket.emit('Cdisconnect', clientId)
  process.exit(code)
}

let over = false

process.on('SIGINT', function (code) {
  over = true
  disconnect()
});

const getTime = () => {
  const date = new Date
  return date.getUTCHours() + 1 + 'H' + date.getUTCMinutes()
}

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const fct = async () => {
  let albums = []
  let currentAlbum
  const album = () => {
    let albumUrl = albums[rand(albums.length)]
    while (currentAlbum === albumUrl) {
      albumUrl = albums[rand(albums.length)]
    }
    currentAlbum = albumUrl
    return albumUrl
  }

  const accountInfo = account.split(':')
  const player = accountInfo[0]
  const login = accountInfo[1]
  const pass = accountInfo[2]
  let code = 0

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
  let usernameInput
  let goToLogin
  let keyCaptcha
  let usedDom
  let reLog
  let loginError

  let connected = false
  let suppressed = false

  let noCache = player === 'napster'// || player === 'spotify'
  let page = await puppet('save/' + player + '_' + login, noCache)

  const exit = async (code) => {
    if (player === 'spotify') {
      await page.gotoUrl('https://spotify.com/logout', true)
    }

    disconnect(code)
  }

  if (!page) { exit(50) }

  socket.on('Sdisconnect', async () => {
    console.log('OOOUT')
    code = 100

    await page.cls(true)

    exit(code)
  })

  const takeScreenshot = async (name, e) => {
    try {
      await page.screenshot({ path: name + '_' + account + '.png' });

      const img = await image2base64(name + '_' + account + '.png')
      if (img) {
        socket.emit('screen', { errorMsg: e, account, streamOn, streamId, img, log: account + ' => ' + (e || name) })
      }
    }
    catch (e) { }
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
    code = e === 'loop' ? 1 : code
    code = e === 'first play' ? 2 : code
    code = e === 'tidal not log' ? 3 : code
    code = e === 'del' ? 4 : code
    code = e === 'retry' ? 5 : code
    code = e === 'retry2' ? 55 : code
    code = e === 'crashed' ? 6 : code
    code = e === 'error' ? 7 : code
    code = e === 'fillForm' ? 5 : code
    code = e === 'login' ? 9 : code
    code = e === 'no bar' ? 10 : code
    code = e === 'used' ? 11 : code

    if (code === 1 || code === 11) {
      socket.emit('retryOk')
    }

    if (code !== 1 && code !== 11) {
      console.log(getTime() + " ERR ", account, e)
      await takeScreenshot('throw', e)
    }

    if (code === 2 && player === "spotify") {
      await page.gotoUrl('https://accounts.spotify.com/revoke_sessions', true)
      await page.gotoUrl('https://spotify.com/logout', true)
    }

    await page.cls(true)

    exit(code)
  }

  try {
    page.on('error', function (err) {
      throw 'crashed'
    });

    page.on('close', function (err) {
      if (code === 0) {
        exit(0)
      }
    });

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

      albums = [
        'https://app.napster.com/artist/honey/album/just-another-emotion',
        // 'https://app.napster.com/artist/yokem/album/boombeats',
        'https://app.napster.com/artist/hanke/album/new-york-story',
        'https://app.napster.com/artist/hanke/album/100-revenge',
        'https://app.napster.com/artist/mahone/album/stone-distraction',
        'https://app.napster.com/artist/hazel/album/electric-nature',
        'https://app.napster.com/artist/lapilluledors/album/red-beast',
        'https://app.napster.com/artist/dj-reid/album/satisfaction-spell',
        'https://app.napster.com/artist/xondes/album/the-last-heat',
        // 'https://app.napster.com/artist/perlaimpinin/album/broken-sunset',
        // 'https://app.napster.com/artist/hazel-rockpop/album/blizzard-of-violence',
        // 'https://app.napster.com/artist/xondes/album/wicked-344744668',
      ]

      usedDom = '.player-error-box'
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

      albums = [
        'https://music.amazon.fr/albums/B07G9RM2MG',
        'https://music.amazon.fr/albums/B07CZDXC9B',
        'https://music.amazon.fr/albums/B07D3NQ235',
        'https://music.amazon.fr/albums/B07G5PPYSY',
        'https://music.amazon.fr/albums/B07D3PGSR4',
        'https://music.amazon.fr/albums/B07MTV7JYS',
        'https://music.amazon.fr/albums/B07PGN58LX',
        'https://music.amazon.fr/albums/B07QCBN3Z4',
        // 'https://music.amazon.fr/albums/B07M75PR8X',
        // 'https://music.amazon.fr/albums/B07LGWP7SX',
        // 'https://music.amazon.fr/albums/B07MBH9D43',
      ]

      usedDom = '.concurrentStreamsPopover'
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

      albums = [
        'https://listen.tidal.com/album/93312939',
        'https://listen.tidal.com/album/93087422',
        'https://listen.tidal.com/album/88716570',
        'https://listen.tidal.com/album/101927847',
        'https://listen.tidal.com/album/102564740',
        'https://listen.tidal.com/album/102503463',
        'https://listen.tidal.com/album/105237098',
        // 'https://listen.tidal.com/album/101962381',
        // 'https://listen.tidal.com/album/101352536',
        // 'https://listen.tidal.com/album/101844025',
      ]

      usedDom = '.WARN'
      reLog = 'body > div > div.main > div > div > div > div > div > button'
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

      albums = [
        'https://open.spotify.com/album/3FJdPTLyJVPYMqQQUyb6lr',
        'https://open.spotify.com/album/5509gS9cZUrbTFege0fpTk',
        'https://open.spotify.com/album/2jmPHLM2be2g19841vHjWE',
        'https://open.spotify.com/album/5CPIRky6BGgl3CCdzMYAXZ',
        'https://open.spotify.com/album/0Tt1ldQ8b4zn5LRcM706ll',
        'https://open.spotify.com/album/2kFEMTIWWw0jXD57Ewr7go',
        'https://open.spotify.com/album/4BR7o0DwEPj1wF1nfcypiY',
        // 'https://open.spotify.com/album/5AZ5oMPCgi9f7mQcStkg60',
        // 'https://open.spotify.com/album/5TeKj5BhfY6nuz8KIJK9zM',
        // 'https://open.spotify.com/album/5KmnlbKwwQ09bDrAnH9kDZ',
      ]
      usedDom = '.ConnectBar'
    }

    const anticaptcha = (websiteURL, websiteKey, invisible = false) => {
      return new Promise((resolve, reject) => {
        request({
          url: 'https://api.anti-captcha.com/createTask',
          method: 'POST',
          json: true,
          data: {
            clientKey: '1598b04fcee925998a78c2b75fd4dbd0',
            task: {
              type: 'NoCaptchaTaskProxyless',
              websiteURL,
              websiteKey,
              invisible
            }
          }
        }, function (err, res, response) {
          if (!response || !response.taskId) {
            console.log(response || 'no response')
            resolve('error')
            return;
          }

          const interval = setInterval(() => {
            if (over) { return clearInterval(interval) }
            request({
              url: 'https://api.anti-captcha.com/getTaskResult',
              method: 'POST',
              json: true,
              data: {
                clientKey: '1598b04fcee925998a78c2b75fd4dbd0',
                taskId: response.taskId
              }
            }, function (err, res, response) {
              try {
                if (response && response.status !== 'processing') {
                  clearInterval(interval)
                  resolve(response.solution.gRecaptchaResponse)
                }
                else if (!response) {
                  throw 'error'
                }
              }
              catch (e) {
                console.log(response || 'no response B')
                clearInterval(interval)
                resolve('error')
                return;
              }
            });
          }, 1000 * 30)
        });
      })
    }

    const resolveCaptcha = async (captchaUrl) => {
      return new Promise(async (resolve, reject) => {
        try {
          const captcha = await anticaptcha(captchaUrl, keyCaptcha, true)
          if (captcha === 'error') { return resolve('error') }

          resolve(captcha)
        }
        catch (e) {
          console.log(e)
          resolve('error')
        }
      })
    }

    const log = async (captcha) => {
      await page.evaluate((captcha) => {
        setTimeout(() => {
          let clients = window.___grecaptcha_cfg.clients[0]
          Object.keys(clients).map(key => {
            let client = clients[key]
            Object.keys(client).map(k => {
              let l = client[k]
              l && l.callback && l.callback(captcha)
            })
          })
        }, 5000);
      }, captcha)
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
          // if (!check) { throw 'tidal not log' }

          // await page.inst(username, login)
          // await page.clk('#recap-invisible')

          // socket.emit('player', clientId)
          tidalCaptcha = true

          const waitForPassword = async () => {
            try {
              await page.inst(password, pass)
            }
            catch (e) {
              await waitForPassword()
            }
          }

          // await waitForPassword()
          const captcha = await resolveCaptcha(url)
          await page.rload()
          await page.inst(username, login)
          await log(captcha)

          await page.inst(password, pass)
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
        usernameInput = await page.ext(username)
        await page.inst(usernameInput ? username : password, login)
      }
      else {
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

    if (player === 'spotify') {
      await page.gotoUrl('https://www.spotify.com/account/overview')
      const productName = await page.get('.product-name')
      if (String(productName).match(/Free|free/)) { throw 'del' }

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

    if (player === 'amazon') {
      await page.jClk(shuffleBtn)
      await page.jClk(repeatBtn)
    }

    if (player === 'spotify') {
      await page.waitFor(2000 + rand(2000))
      const stopBeforePlay = await page.ext(usedDom)
      if (stopBeforePlay) { throw 'used' }

      const currentUA = await page.evaluate(() => {
        return navigator.userAgent
      })
      const ua = '--user-agent=Mozilla/5.0 (Linux; Android 4.0.4; Galaxy Nexus Build/IMM76B) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.133 Mobile Safari/535.19'

      const spotErr = await page.get('.ErrorPage__inner', 'innerText')
      if (String(spotErr).match(/limit/)) {
        await takeScreenshot('firstPlay')
        await page.setUserAgent(ua)
        await page.gotoUrl(album())
        await page.clk('.play-pause.middle-align')
        takeScreenshot('mobile')
        await page.waitFor(1000 * 45)
        await page.setUserAgent(currentUA)
        await page.gotoUrl(album())
      }
    }

    let trys = 0
    const waitForPlayBtn = async () => {
      try {
        await page.ext(playBtn)
        socket.emit('retryOk')
      }
      catch (e) {
        await takeScreenshot('firstPlay')
        if (++trys >= 3) { throw 'first play' }
        await page.gotoUrl(album())
        await waitForPlayBtn()
      }
    }

    await waitForPlayBtn()

    await page.clk(playBtn, 'first play')

    if (player === 'napster' || player === 'tidal' || player === 'spotify') {
      await page.waitFor(2000 + rand(2000))
      await page.jClk(shuffleBtn)

      const clickLoop = async () => {
        await page.waitFor(2000 + rand(2000))
        const existRepeatBtnOk = await page.ext(repeatBtnOk)
        if (!existRepeatBtnOk) {
          await page.jClk(repeatBtn)
          clickLoop()
        }
      }

      clickLoop()
    }

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

    socket.emit('player', clientId)

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
    let timeLine
    let style
    let retry = false
    let retryDom = false

    const loop = async () => {
      try {
        used = await page.ext(usedDom)

        if (used) {
          if (player === 'tidal') {
            used = await page.evaluate((usedDom) => {
              return document.querySelector(usedDom) && document.querySelector(usedDom).innerHTML
            }, usedDom)

            used = String(used).match(/currently/) ? used : false

            if (!used) {
              await page.jClk('#wimp > div > div > div > div > div > button')
            }
            else {
              throw 'used'
            }
          }
          else {
            throw 'used'
          }
        }
      }
      catch (e) { return exit(0) }

      try {
        if (player === 'napster') {
          timeLine = 'span.ui-slider-handle'
          style = 'left'
        }
        else if (player === 'tidal') {
          timeLine = '[class*="fillingBlock"] > div:first-child'
          style = 'transform'
        }
        else if (player === 'amazon') {
          timeLine = '.scrubberBackground'
          style = 'width'
        }
        else if (player === 'spotify') {
          timeLine = '.progress-bar__fg'
          style = 'transform'
        }

        try {
          t1 = await page.evaluate(({ timeLine, style }) => {
            return document.querySelector(timeLine) && document.querySelector(timeLine).style[style]
          }, { timeLine, style })

          await page.waitFor(1000 * 10)

          t2 = await page.evaluate(({ timeLine, style }) => {
            return document.querySelector(timeLine) && document.querySelector(timeLine).style[style]
          }, { timeLine, style })
        }
        catch (e) { return exit(0) }

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

            try {
              t1 = await page.evaluate(({ timeLine, style }) => {
                return document.querySelector(timeLine) && document.querySelector(timeLine).style[style]
              }, { timeLine, style })
            }
            catch (e) { return exit(0) }

            if (t1 === '0%') {
              retry = true
            }
          }
          else {
            await page.wfs(loggedDom, true)
            if (player !== 'tidal') {
              await page.gotoUrl(album())
            }
            await page.clk(playBtn, 'failedLoop')
            retry = true
          }

          if (retry && !retryDom) {
            retryDom = true
            await takeScreenshot('retry')
          }
        }

        // socket.emit('stayAlive')
        loop()
      }
      catch (e) {
        catchFct(e)
      }
    }

    loop()

    socket.on('runnerLoop', () => {
      throw 'loop'
    })

    let changeTime = 1000 * 60 * 10 + 1000 * rand(60 * 10)
    await page.waitFor(changeTime)

    let tryChange = 0
    const loopChange = async () => {
      try {
        await page.gotoUrl(album())
        await page.clk(playBtn, 'changeLoop')
      }
      catch (e) {
        if (++tryChange < 3) {
          loopChange()
        }
        catchFct(e)
      }
    }

    loopChange()

    let restartTime = 1000 * 60 * 10 + 1000 * rand(60 * 10)
    await page.waitFor(restartTime)
    throw 'loop'
  }
  catch (e) {
    catchFct(e)
  }
}

fct()
