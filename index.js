const puppeteer = require('puppeteer');
const fs = require('fs');
const request = require('ajax-request');

process.setMaxListeners(Infinity)

const check = process.env.CHECK || process.env.TYPE
let golbalAccountsLength = []
let accounts = []
let accountsValid = []
let over = false
let countTimeout = 0
const max = 20
const pause = check ? 10 : 30
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
  accounts = accounts.filter(a => a !== account)

  accountsValid = accountsValid.filter(a => a !== account)
  accountsValid.push(account)

  accountInfo = account.split(':')
  const player = accountInfo[0]
  const login = accountInfo[1]
  const pass = accountInfo[2]
  const tokenAutoLog = accountInfo[4] || null

  const params = {
    executablePath: '/usr/bin/google-chrome-stable',
    userDataDir: 'save/' + player + '_' + login,
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
    defaultViewport: {
      width: 720,
      height: 450,
    }
    // slowMo: 200,
  }

  if (player === 'napster' || player === 'spotify') {
    delete params.userDataDir
  }

  let browser

  try {
    browser = await puppeteer.launch(params);
  }
  catch (e) {
    errorPath = true
    params.executablePath = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
    browser = await puppeteer.launch(params);
  }

  const pages = await browser.pages()
  const page = pages[0]

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  const gotoUrl = async (url) => {
    try {
      await page.goto(url, { timeout: 1000 * 60 * 5, waitUntil: 'domcontentloaded' })
      return true
    } catch (error) {
      throw 'error connect ' + account
      return false
    }
  }

  const waitForSelector = async (selector, timeout = 1000 * 60 * 3, retry = false) => {
    try {
      await page.waitForSelector(selector, { timeout })
      return true
    } catch (error) {
      if (retry) {
        throw 'Selector :' + selector + ' not found'
      }
      else {
        await page.reload()
        await waitForSelector(selector, timeout, true)
      }
    }
  }

  const exists = async (selector, timeout = 1000 * 10) => {
    try {
      await page.waitForSelector(selector, { timeout })
      return true
    } catch (error) {
      return false
    }
  }

  const click = async (selector) => {
    const exist = await waitForSelector(selector)

    try {
      await page.waitFor(2000 + rand(2000))
      await page.evaluate(selector => {
        document.querySelector(selector) && document.querySelector(selector).click()
      }, selector)

      return true
    }
    catch (e) {
      console.log('Click error ' + selector, account, 'exist :' + exist)
      return false
    }
  }

  const justClick = async (selector) => {
    const exist = await exists(selector)
    if (!exist) { return false }

    try {
      await page.waitFor(2000 + rand(2000))
      await page.evaluate(selector => {
        document.querySelector(selector) && document.querySelector(selector).click()
      }, selector)
      return true
    }
    catch (e) {
      console.log('Justclick ' + selector, account)
    }

  }

  const insert = async (selector, text) => {
    await click(selector)

    try {
      await page.waitFor(2000 + rand(2000))
      const elementHandle = await page.$(selector);
      await page.evaluate(selector => {
        document.querySelector(selector).value = ''
      }, selector)
      await elementHandle.type(text, { delay: 300 });

      return true
    }
    catch (e) {
      console.log('Insert error ' + selector, account)
    }
  }

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
      await page.goto('about:blank')
      await page.close()
    }
    catch (e) { }

    accountsValid = accountsValid.filter(a => a !== account)

    console.log(getTime() + " ERROR ", account, e)

    if (!del) {
      if (!check) {
        accounts.push(account)
      }
      else {
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
        'https://app.napster.com/artist/hazel-rockpop/album/blizzard-of-violence',
        'https://app.napster.com/artist/perlaimpinin/album/broken-sunset',
        'https://app.napster.com/artist/xondes/album/wicked-344744668',
        'https://app.napster.com/artist/mahone/album/stone-distraction/',
        'https://app.napster.com/artist/lapilluledors/album/red-beast',
        'https://app.napster.com/artist/hazel/album/electric-nature',
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
        'https://music.amazon.fr/albums/B07LGWP7SX',
        'https://music.amazon.fr/albums/B07MBH9D43',
        'https://music.amazon.fr/albums/B07M75PR8X',
        'https://music.amazon.fr/albums/B07MTV7JYS',
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
        'https://listen.tidal.com/album/101352536',
        'https://listen.tidal.com/album/101927847',
        'https://listen.tidal.com/album/101962381',
        'https://listen.tidal.com/album/101844025',
        'https://listen.tidal.com/album/102503463',
        'https://listen.tidal.com/album/102564740',
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
        'https://open.spotify.com/album/5TeKj5BhfY6nuz8KIJK9zM',
        'https://open.spotify.com/album/2jmPHLM2be2g19841vHjWE',
        'https://open.spotify.com/album/5AZ5oMPCgi9f7mQcStkg60',
        'https://open.spotify.com/album/5KmnlbKwwQ09bDrAnH9kDZ',
        'https://open.spotify.com/album/0Tt1ldQ8b4zn5LRcM706ll',
        'https://open.spotify.com/album/5CPIRky6BGgl3CCdzMYAXZ',
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

    // await page.setRequestInterception(true);
    // page.on('request', async request => {
    //   const requestUrl = await request.url()
    //   if (request.resourceType() === 'image' && !/svg$/.test(requestUrl)) {
    //     return request.abort(['blockedbyclient']);
    //   }
    //   request.continue();
    // });

    // ***************************************************************************************************************************************************************
    // *************************************************************************** CONNECT ***************************************************************************
    // ***************************************************************************************************************************************************************

    if (player === 'tidal') {
      await gotoUrl(album())
      await page.waitFor(2000 + rand(2000))
      const notConnected = await justClick(goToLogin)

      if (notConnected) {
        const done = await justClick(reLog)

        if (!done) {
          await insert(username, login)

          // const validCallback = check ? await resolveCaptcha() : 'click'
          // if (validCallback === 'click') {
          //   await click('#recap-invisible')
          // }
          // else if (validCallback !== 'done') { throw validCallback }

          await waitForSelector(password, 1000 * 60 * 5)
          await insert(password, pass)
          await click('body > div > div > div > div > div > div > div > form > button')

          await page.waitFor(5000 + rand(2000))
          connected = await exists(loggedDom)
          if (!connected) { throw 'del' }
          await gotoUrl(album())
        }
      }
    }

    if (player === 'spotify' && check) {
      if (tokenAutoLog) {
        await gotoUrl('https:' + tokenAutoLog)
        await page.waitFor(5000 + rand(2000))
      }
      await gotoUrl('https://www.spotify.com/fr/account/overview')
      const free = await page.evaluate(() => {
        const typeAccount = document.querySelector('.product-name')
        return typeAccount && /Free|free/.test(typeAccount.innerHTML)
      })
      if (free) { throw 'del' }
    }

    if (player === 'amazon' || player === 'spotify') {
      await gotoUrl(album())
      connected = await exists(loggedDom)
    }

    if (!connected && player !== 'tidal') {
      if (player === 'spotify' && process.env.RAND) {
        // throw 'Spotify relog ' + login
      }
      await page.waitFor(2000 + rand(2000))
      await gotoUrl(url)

      usernameInput = await exists(username)

      await insert(usernameInput ? username : password, login)
      await insert(password, pass)
      await justClick(remember)

      let validCallback = 'click'
      // if (player === 'spotify') {
      //   validCallback = await resolveCaptcha()
      //   if (validCallback !== 'click' && validCallback !== 'done') { throw validCallback }
      // }

      if (validCallback === 'click') {
        await justClick(loginBtn)
      }

      if (player === 'amazon') {
        await page.waitFor(10000 + rand(2000))
      }
      await page.waitFor(2000 + rand(2000))
      suppressed = await exists(loginError)

      if (suppressed) { throw 'del' }

      await gotoUrl(album())
    }

    if (player === 'napster') {
      const issueAccount = await exists('.account-issue')
      const issueRadio = await exists('.unradio')
      if (issueAccount || issueRadio) { throw 'del' }
      const reload = await exists('#main-container .not-found')
      if (reload) {
        await gotoUrl(album())
      }
    }

    if (check) {
      main()
    }

    // ***************************************************************************************************************************************************************
    // *************************************************************************** PLAY ******************************************************************************
    // ***************************************************************************************************************************************************************

    if (player === 'amazon') {
      await justClick(shuffleBtn)
      await justClick(repeatBtn)
    }

    let stopBeforePlay
    if (player === 'spotify') {
      await page.waitFor(2000 + rand(2000))
      stopBeforePlay = await exists(usedDom)
    }

    if (!stopBeforePlay) {
      try {
        await click(playBtn)
      }
      catch (e) {
        console.log('start play')
        throw 'error'
      }

      if (player === 'napster' || player === 'tidal' || player === 'spotify') {
        const clickLoop = () => {
          setTimeout(async () => {
            const existRepeatBtnOk = await exists(repeatBtnOk)
            if (!existRepeatBtnOk) {
              await justClick(repeatBtn)
              clickLoop()
            }
          }, 2600);
        }

        clickLoop()

        await justClick(shuffleBtn)
      }
    }

    if (check) {
      setTimeout(async () => {
        try {
          await page.goto('about:blank')
          await page.close()
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

        await page.goto('about:blank')
        await page.close()
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
          await gotoUrl(album())
          await waitForSelector(playBtn)

          try {
            await click(playBtn)
          }
          catch (e) {
            console.log('loop play')
            throw 'error'
          }

          timeLoop = 0
        }

        used = await exists(usedDom)

        if (used) {
          used = await page.evaluate((usedDom) => {
            return document.querySelector(usedDom) && document.querySelector(usedDom).innerHTML
          }, usedDom)

          if (player === 'tidal') {
            used = typeof used === 'string' && used.match(/currently/) ? used : false

            if (!used) {
              await justClick('#wimp > div > div > div > div > div > button')
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
                if (player === 'tidal') {
                  const delTidal = await page.evaluate(() => {
                    return document.querySelector('.ReactModal__Overlay') && document.querySelector('.ReactModal__Overlay').innerText
                  })
                  if (typeof delTidal === 'string' && delTidal.match(/expired/)) {
                    throw 'del'
                  }
                }
                console.log(getTime(), ' no bar ' + t1, account)
                await page.screenshot({ path: 'nobar_' + login + '_screenshot.png' });
              }
            }
            else {
              await justClick('.player-play-button .icon-pause2')
              await justClick('.player-play-button .icon-play-button')
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
  if (over || errorPath || check) { return clearInterval(mainInter) }
  main()
}, 1000 * pause);

let file = process.env.FILE || 'napsterAccount.txt'

fs.readFile(file, 'utf8', async (err, data) => {
  if (err) return console.log(err);
  fs.readFile('napsterAccountDel.txt', 'utf8', async (err2, dataDel) => {
    if (err2) return console.log(err2);

    dataDel = dataDel.split(',').filter(e => e)
    accounts = data = data.split(',').filter(e => dataDel.indexOf(e) < 0)

    if (process.env.TYPE) {
      accounts = accounts.filter(m => m.split(':')[0] === process.env.TYPE)
    }
    else if (!process.env.FILE && !check) {
      const split = parseInt(data.length / 2)
      if (process.env.BEGIN === '2') {
        accounts = data.slice(split)
      }
      else {
        accounts = data.slice(0, split)
      }
    }

    accounts = process.env.RAND ? shuffle(accounts) : accounts
    golbalAccountsLength = accounts.length
    console.log(accounts.length)
    main()
  })
});

process.on('SIGINT', function (code) {
  over = true
});
