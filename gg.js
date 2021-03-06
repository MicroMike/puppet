const fs = require('fs');
const request = require('ajax-request');
const puppet = require('./puppet')

process.setMaxListeners(Infinity)

// const check = process.env.CHECK || process.env.RECHECK || process.env.TYPE
const check = true
let accounts = []
let accountsValid = []
let over = false
let countTimeout = 0
const max = 20
const pause = check ? 15 : 60
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

let albums = [
  { url: 'https://open.spotify.com/episode/5CTWjaln8LbP3JMnDfL2SR', nb: 80 },
  { url: 'https://open.spotify.com/episode/4LNlZZiOy32VQvTGXJ9BR9', nb: 80 },
  { url: 'https://open.spotify.com/episode/0zDeN4F8lTTrieI3IvsCiI', nb: 80 },
  { url: 'https://open.spotify.com/episode/07AeZf0ExTxB864NZIOGRP', nb: 80 },
  { url: 'https://open.spotify.com/episode/77PytpYZNCs6d8uyzwYn1p', nb: 80 },
  { url: 'https://open.spotify.com/episode/5get1YOTsPf6RAPIySupcV', nb: 80 },
  { url: 'https://open.spotify.com/episode/5QrKbluyFZsg6jJ26ye7f6', nb: 80 },
  { url: 'https://open.spotify.com/episode/4AFzaLO87GuTdtSuIk82r2', nb: 80 },
  { url: 'https://open.spotify.com/episode/5YwlHKInZK9O6So8trYhBm', nb: 80 },
]

let albumNbCount = 0
let albumId = 0

const album = () => {
  if (albumNbCount++ < albums[albumId].nb) {
    return albums[albumId].url
  }
  else {
    albumId++
    albumNbCount = 0
    return albums[albumId].url
  }
}

const main = async (restartAccount) => {
  const CalbumNbCount = albumNbCount
  const CalbumId = albumId
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

  let page = await puppet('save/' + player + '_' + login)

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

    console.log(getTime() + " ERROR ", account, e)

    if (!del) {
      accounts.push(account)
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

    main()
  }

  setTimeout(() => {
    main()
  }, 1000 * 30);

  try {
    if (player === 'spotify') {
      url = 'https://accounts.spotify.com/fr/login'
      loggedDom = '.sessionInfo'

      username = '#login-username'
      password = '#login-password'
      loginBtn = '#login-button'
      loginError = '.alert.alert-warning'

      playBtn = '.TrackListHeader__button.TrackListHeader__button--bottom button'
      repeatBtn = '[class*="spoticon-repeat"]'
      repeatBtnOk = '.spoticon-repeat-16.control-button--active'
      shuffleBtn = '.spoticon-shuffle-16:not(.control-button--active)'

      keyCaptcha = '6LeIZkQUAAAAANoHuYD1qz5bV_ANGCJ7n7OAW3mo'

      usedDom = '.ConnectBar'
    }

    // ***************************************************************************************************************************************************************
    // *************************************************************************** CONNECT ***************************************************************************
    // ***************************************************************************************************************************************************************

    await page.gotoUrl('https://open.spotify.com/episode/3aDHIMOr84YCdppa6MaNiy?si=EWp8JfF3Rim_ytrsvKCKRg')
    connected = await page.ext(loggedDom)

    if (!connected) {
      await page.waitFor(2000 + rand(2000))
      await page.gotoUrl(url)

      usernameInput = await page.ext(username)

      await page.inst(usernameInput ? username : password, login)
      await page.inst(password, pass)
      await page.jClk(remember)
      await page.jClk(loginBtn)

      await page.waitFor(2000 + rand(2000))
      suppressed = await page.ext(loginError)

      if (suppressed) { throw 'del' }
    }

    await page.gotoUrl('https://open.spotify.com/episode/3aDHIMOr84YCdppa6MaNiy?si=EWp8JfF3Rim_ytrsvKCKRg')

    // ***************************************************************************************************************************************************************
    // *************************************************************************** PLAY ******************************************************************************
    // ***************************************************************************************************************************************************************

    await page.waitFor(2000 + rand(2000))
    let stopBeforePlay = await page.ext(usedDom)

    if (stopBeforePlay) {
      await page.cls()
      main()
      return
    }

    await page.gotoUrl(album())
    await page.clk(playBtn, 'first play')

    setTimeout(async () => {
      console.log('album :' + CalbumId, 'play ' + CalbumNbCount)
      accounts.push(account)
      await page.cls()
    }, 1000 * 60 + rand(1000 * 30));
  }
  catch (e) {
    catchFct(e)
  }
}

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
      accounts = accounts.filter(m => m.split(':')[0] === 'spotify')
    }

    accounts = process.env.RAND || process.env.RECHECK ? shuffle(accounts) : accounts
    console.log(accounts.length)
    main()
  })
});

process.on('SIGINT', function (code) {
  over = true
});