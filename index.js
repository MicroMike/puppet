const fs = require('fs');
const request = require('ajax-request');
const puppet = require('./puppet')

process.setMaxListeners(Infinity)

const check = process.env.CHECK || process.env.RECHECK || process.env.TYPE
let accounts = []
let accountsValid = []
let over = false
let countTimeout = 0
const max = 20
const pause = check ? 15 : 30
let errorPath = false

const getTime = () => {
  const date = new Date
  return date.getUTCHours() + 1 + 'H' + date.getUTCMinutes()
}

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

function shuffle(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr.sort(() => { return rand(2) })
  }
  return arr
}

const anticaptcha = (websiteURL, websiteKey, invisible = false) => {
  return new Promise((resolve, reject) => {
    request({
      url: 'https://api.anti-captcha.com/createTask',
      method: 'POST',
      json: true,
      data: {
        clientKey: '0cab7e41bab98900c321592426ec2183',
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
            clientKey: '0cab7e41bab98900c321592426ec2183',
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

const main = async (restartAccount) => {
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
  if (over) { return }
  if (!restartAccount && !check) {
    if (accountsValid.length >= max) { return }
  }

  let account = restartAccount || accounts[0]
  if (!account) { return }

  accountInfo = account.split(':')
  const player = accountInfo[0]
  const login = accountInfo[1]
  const pass = accountInfo[2]
  const tokenAutoLog = accountInfo[4] || null

  let noCache = player === 'napster' || player === 'spotify'
  let page = await puppet('save/' + player + '_' + login, noCache)

  if (!page) { return }

  accounts = accounts.filter(a => a !== account)
  accountsValid = accountsValid.filter(a => a !== account)
  accountsValid.push(account)

  process.stdout.write(getTime() + " " + accountsValid.length + "\r");

  let username
  let password
  let url
  let remember
  let loginBtn
  let playBtn
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

  let changeInterval

  const catchFct = async (e) => {

    clearTimeout(changeInterval)

    const del = e === 'del'

    try {
      await page.screenshot({ path: login + '_screenshot.png' });
      await page.cls()
    }
    catch (e) { }

    accountsValid = accountsValid.filter(a => a !== account)

    process.stdout.write(getTime() + " " + accountsValid.length + "\r");

    if (check) {
      console.log(getTime() + " ERROR ", account, e)
    }

    if (!del) {
      accounts.push(account)
      if (check) {
        main()
      }
    }
    else {
      fs.readFile('napsterAccountDel.txt', 'utf8', function (err, data) {
        if (err) return console.log(err);
        data = data.split(',').filter(e => e)
        data = data.filter(a => a !== account)
        data.push(account)
        fs.writeFile('napsterAccountDel.txt', data.join(','), function (err) {
          if (err) return console.log(err);
        });
      });
    }
  }

  try {
    if (player === 'napster') {
      url = 'https://app.napster.com/login/'
      loggedDom = '.track-list-header .shuffle-button'

      username = '#username'
      password = '#password'
      loginBtn = '.signin'
      loginError = '.login-error'

      playBtn = '.track-list-header .shuffle-button'
      repeatBtn = '.repeat-button'
      repeatBtnOk = '.repeat-button.repeat'

      albums = [
        'https://app.napster.com/artist/honey/album/just-another-emotion',
        'https://app.napster.com/artist/yokem/album/boombeats',
        'https://app.napster.com/artist/hanke/album/new-york-story',
        'https://app.napster.com/artist/hanke/album/100-revenge',
        'https://app.napster.com/artist/mahone/album/stone-distraction/',
        'https://app.napster.com/artist/hazel/album/electric-nature',
        'https://app.napster.com/artist/lapilluledors/album/red-beast',
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

      albums = [
        'https://music.amazon.fr/albums/B07G9RM2MG',
        'https://music.amazon.fr/albums/B07CZDXC9B',
        'https://music.amazon.fr/albums/B07D3NQ235',
        'https://music.amazon.fr/albums/B07G5PPYSY',
        'https://music.amazon.fr/albums/B07D3PGSR4',
        'https://music.amazon.fr/albums/B07MTV7JYS',
        'https://music.amazon.fr/albums/B07PGN58LX',
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

      playBtn = '[class*="controls"] button + button'
      pauseBtn = '.playerIconPauseRing'
      repeatBtn = '[class*="repeatButton"]'
      repeatBtnOk = '[class*="repeatStateIcon"][class*="all"]'

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

      keyCaptcha = '6LeIZkQUAAAAANoHuYD1qz5bV_ANGCJ7n7OAW3mo'

      albums = [
        'https://open.spotify.com/album/3FJdPTLyJVPYMqQQUyb6lr',
        'https://open.spotify.com/album/5509gS9cZUrbTFege0fpTk',
        'https://open.spotify.com/album/2jmPHLM2be2g19841vHjWE',
        'https://open.spotify.com/album/5CPIRky6BGgl3CCdzMYAXZ',
        'https://open.spotify.com/album/0Tt1ldQ8b4zn5LRcM706ll',
        'https://open.spotify.com/album/2kFEMTIWWw0jXD57Ewr7go',
        // 'https://open.spotify.com/album/5AZ5oMPCgi9f7mQcStkg60',
        // 'https://open.spotify.com/album/5TeKj5BhfY6nuz8KIJK9zM',
        // 'https://open.spotify.com/album/5KmnlbKwwQ09bDrAnH9kDZ',
      ]
      usedDom = '.ConnectBar'
    }

    const resolveCaptcha = async () => {
      return new Promise(async (resolve, reject) => {
        try {
          let errorLog
          const needCaptcha = await page.evaluate(() => {
            return window.___grecaptcha_cfg && window.___grecaptcha_cfg.clients ? location.href : false
          })

          if (!needCaptcha) { return resolve('click') }

          const captcha = process.env.RAND ? true : await anticaptcha(needCaptcha, keyCaptcha, true)
          if (captcha === 'error') { return resolve('error') }

          await page
            .evaluate((captcha) => {
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
          resolve('done')
        }
        catch (e) {
          console.log(e)
          resolve('error')
        }
      })
    }

    // ***************************************************************************************************************************************************************
    // *************************************************************************** CONNECT ***************************************************************************
    // ***************************************************************************************************************************************************************

    if (player === 'tidal') {
      await page.gotoUrl(album())
      await page.waitFor(2000)
      const notConnected = await page.jClk(goToLogin)

      if (notConnected) {
        await page.waitFor(2000)
        const done = await page.jClk(reLog)

        if (!done) {
          await page.inst(username, login)

          // const validCallback = check ? await resolveCaptcha() : 'click'
          // if (validCallback === 'click') {
          //   await page.clk('#recap-invisible')
          // }
          // else if (validCallback !== 'done') { throw validCallback }

          await page.wfs(password, 1000 * 60 * 5)
          await page.inst(password, pass)
          await page.clk('body > div > div > div > div > div > div > div > form > button', 'tidal connect')

          await page.waitFor(5000 + rand(2000))
          connected = await page.ext(loggedDom)
          if (!connected) { throw 'del' }
          await page.gotoUrl(album())
        }
      }
    }

    if (player === 'spotify' && check) {
      if (tokenAutoLog) {
        await page.gotoUrl('https:' + tokenAutoLog)
        await page.waitFor(5000 + rand(2000))
      }
      await page.gotoUrl('https://www.spotify.com/fr/account/overview')
      const free = await page.evaluate(() => {
        const typeAccount = document.querySelector('.product-name')
        return typeAccount && /Free|free/.test(typeAccount.innerHTML)
      })
      if (free) { throw 'del' }
    }

    if (player === 'amazon' || player === 'spotify') {
      await page.gotoUrl(album())
      connected = await page.ext(loggedDom)
    }

    if (!connected && player !== 'tidal') {
      if (player === 'spotify' && process.env.RAND) {
        // throw 'Spotify relog ' + login
      }
      await page.waitFor(2000 + rand(2000))
      await page.gotoUrl(url)

      usernameInput = await page.ext(username)

      await page.inst(usernameInput ? username : password, login)
      await page.inst(password, pass)
      await page.jClk(remember)

      let validCallback = 'click'
      // if (player === 'spotify') {
      //   validCallback = await resolveCaptcha()
      //   if (validCallback !== 'click' && validCallback !== 'done') { throw validCallback }
      // }

      if (validCallback === 'click') {
        await page.jClk(loginBtn)
      }

      if (player === 'amazon') {
        await page.waitFor(10000 + rand(2000))
      }
      await page.waitFor(2000 + rand(2000))
      suppressed = await page.ext(loginError)

      if (suppressed) { throw 'del' }

      await page.gotoUrl(album())
    }

    if (player === 'napster') {
      const issueAccount = await page.ext('.account-issue')
      const issueRadio = await page.ext('.unradio')
      if (issueAccount || issueRadio) { throw 'del' }
      const reload = await page.ext('#main-container .not-found')
      if (reload) {
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

    let stopBeforePlay
    if (player === 'spotify') {
      await page.waitFor(2000 + rand(2000))
      stopBeforePlay = await page.ext(usedDom)
    }

    if (!stopBeforePlay) {
      await page.clk(playBtn, 'first play')

      if (player === 'napster' || player === 'tidal' || player === 'spotify') {
        const clickLoop = () => {
          setTimeout(async () => {
            const existRepeatBtnOk = await page.ext(repeatBtnOk)
            if (!existRepeatBtnOk) {
              await page.jClk(repeatBtn)
              clickLoop()
            }
          }, 2600);
        }

        clickLoop()

        await page.jClk(shuffleBtn)
      }
    }

    if (player === 'tidal') {
      const delTidal = await page.evaluate(() => {
        return document.querySelector('.ReactModal__Overlay') && document.querySelector('.ReactModal__Overlay').innerText
      })
      if (typeof delTidal === 'string' && delTidal.match(/expired/)) {
        throw 'del'
      }
    }

    if (check) {
      setTimeout(async () => {
        try {
          await page.cls()
        }
        catch (e) { }
      }, 1000 * 30);
      return
    }

    // ***************************************************************************************************************************************************************
    // *************************************************************************** LOOP ******************************************************************************
    // ***************************************************************************************************************************************************************

    let t1
    let t2
    let freeze = 1
    let fix = false
    let used
    let changing = false
    let timeLine
    let style

    const restart = async (timeout = 0) => {
      try {
        accountsValid = accountsValid.filter(a => a !== account)
        setTimeout(() => {
          accounts.push(account)
        }, timeout);

        await page.cls()
      }
      catch (e) {
        catchFct('restart')
      }
    }

    let timeLoop = 0
    const loop = async () => {
      try {
        let restartTime = 1000 * 60 * 30 + rand(1000 * 60 * 30)
        if (timeLoop >= restartTime) {
          restart()
          return
        }

        let changeTime = check ? 1000 * 60 * 3 : 1000 * 60 * 3 + rand(1000 * 60 * 7)
        if (timeLoop >= changeTime) {
          const changeAlbum = album()
          await page.gotoUrl(changeAlbum)
          await page.clk(playBtn, 'loop play ' + changeAlbum)

          timeLoop = 0
        }

        used = await page.ext(usedDom)

        if (used) {
          used = await page.evaluate((usedDom) => {
            return document.querySelector(usedDom) && document.querySelector(usedDom).innerHTML
          }, usedDom)

          if (player === 'tidal') {
            used = typeof used === 'string' && used.match(/currently/) ? used : false

            if (!used) {
              await page.jClk('#wimp > div > div > div > div > div > button')
            }
          }
        }

        if (!used) {
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
            t1 = await page.evaluate((args) => {
              return document.querySelector(args.timeLine) && document.querySelector(args.timeLine).style[args.style]
            }, { timeLine, style })
          }
          catch (e) {
            //console.log(e)
            return
          }

          if (t1 === t2) { freeze++ }
          else { freeze = 0 }

          if (freeze >= 2) {
            freeze = 0

            if (!t1 || player !== 'napster') {
              fix = true
              if (!t1) {
                console.log(getTime(), ' no bar ' + t1, account)
                await page.screenshot({ path: 'nobar_' + login + '_screenshot.png' });
              }
            }
            else {
              await page.jClk('.player-play-button .icon-pause2')
              await page.jClk('.player-play-button .icon-play-button')
            }
          }

          t2 = t1
        }

        if (used || fix) {
          restart(used ? 1000 * 60 * 60 : 0)
          return
        }

        loopAdd = 1000 * 5
        timeLoop += loopAdd
        changeInterval = setTimeout(() => {
          if (over) { return }
          loop()
        }, loopAdd);
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

const mainInter = setInterval(() => {
  if (over || errorPath || accounts.length === 0) { return clearInterval(mainInter) }
  main()
}, 1000 * pause);

let file = process.env.FILE || 'napsterAccount.txt'

fs.readFile(file, 'utf8', async (err, data) => {
  if (err) return console.log(err);

  fs.readFile('napsterAccountDel.txt', 'utf8', async (err2, dataDel) => {
    if (err2) return console.log(err2);

    accounts = data.split(',')

    if (!process.env.RECHECK) {
      dataDel = dataDel.split(',').filter(e => e)
      accounts = accounts.filter(e => dataDel.indexOf(e) < 0)
    }
    else {
      fs.writeFile('napsterAccountDel.txt', '', function (err) {
        if (err) return console.log(err);
      });
    }

    if (process.env.TYPE) {
      accounts = accounts.filter(m => m.split(':')[0] === process.env.TYPE)
    }

    accounts = process.env.RAND || process.env.RECHECK ? shuffle(accounts) : accounts
    console.log(accounts.length)
    main()
  })
});

process.on('SIGINT', function (code) {
  over = true
});
