process.setMaxListeners(0)

const puppeteer = require('puppeteer');

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

module.exports = async (userDataDir, noCache) => {

  const params = {
    executablePath: '/usr/bin/google-chrome-stable',
    userDataDir,
    headless: false,
    args: [
      // '--no-sandbox',
      // '--disable-setuid-sandbox',
      '--disable-translate',
    ],
    defaultViewport: {
      width: 720,
      height: 450,
    }
  }

  if (noCache) {
    delete params.userDataDir
  }

  let browserContext

  // params.executablePath = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"

  try {
    // const launch = await puppeteer.launch(params);
    // browserContext = launch.defaultBrowserContext()
  }
  catch (e) {
    // console.log('BROWSER FAIL')
    //process.exit()
    return false
  }

  // const pages = await browserContext.pages()
  // const page = pages[0]

  // await page.evaluateOnNewDocument(() => {
  //   Object.defineProperty(navigator, 'webdriver', {
  //     get: () => false,
  //   });
  // });

  // await page.setRequestInterception(true);
  // page.on('request', async request => {
  //   const requestUrl = await request.url()
  //   if (request.resourceType() === 'image' && !/svg$/.test(requestUrl)) {
  //     return request.abort(['blockedbyclient']);
  //   }
  //   request.continue();
  // });

  const Nightmare = require('nightmare')
  const nightmare = Nightmare({
    electronPath: require('electron'),
    // openDevTools: {
    //   mode: 'detach'
    // },
    alwaysOnTop: false,
    waitTimeout: 1000 * 60 * 3,
    show: true,
    typeInterval: 300,
    webPreferences: {
      partition: noCache ? '' : 'persist: ' + userDataDir,
      webSecurity: false,
      allowRunningInsecureContent: true,
      plugins: true,
      images: false,
      experimentalFeatures: true
    }
  })

  let page = {}

  page.waitFor = async (timeOrSelector) => {
    await nightmare
      .wait(timeOrSelector)
      .catch(e => {
        throw 'waitFor ' + timeOrSelector
      })
  }

  page.refresh = async () => {
    await nightmare
      .refresh()
      .catch(e => {
        throw 'refresh error ' + e
      })
  }

  page.gotoUrl = async (url) => {
    await nightmare
      .wait(2000 + rand(1000))
      .goto(url)
      .wait(2000 + rand(1000))
      .catch(e => {
        throw 'error load'
      })
  }

  page.ext = async (selector, timeout = 1000 * 10) => {
    await page.waitFor(timeout)
    const exist = await nightmare.exists(selector)
    return exist
  }

  page.clk = async (selector, error) => {
    await nightmare
      .wait(2000 + rand(2000))
      .click(selector)
      .catch(e => {
        throw error || 'Click error ' + selector
      })
  }

  page.jClk = async (selector) => {
    const exist = await page.ext(selector)
    if (!exist) { return false }

    const isOk = await nightmare
      .click(selector)
      .catch(e => {
        console.log(userDataDir + ' Justclick ' + selector)
        return false
      })

    return isOk === null
  }

  page.inst = async (selector, text) => {
    await nightmare
      .wait(2000 + rand(2000))
      .insert(selector, '')
      .type(selector, text)
      .catch(e => {
        throw 'Insert error ' + selector
      })
  }

  page.get = async (selector) => {
    const exist = await page.ext(selector)
    if (!exist) { return '' }

    const html = await nightmare
      .evaluate(selector => {
        return document.querySelector(selector).innerHTML
      }, selector)
      .catch(e => {
        console.log(userDataDir + ' Get error ' + selector)
        return ''
      })

    return html
  }

  page.cls = async () => {
    await nightmare
      .end()
      .catch(e => {
        throw 'Can\'t close', e
      })
  }

  page.log = async (captcha) => {
    await nightmare
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
  }

  page.timeLine = async (timeLine, style) => {
    const time = await nightmare
      .evaluate((args) => {
        return document.querySelector(args.timeLine).style[args.style]
      }, { timeLine, style })
      .catch(e => {
        console.log(userDataDir + ' Timeline error ' + selector)
        return false
      })

    return time
  }

  page.screenshot = async (path) => {
    await nightmare
      .screenshot(path)
      .catch(e => {
        console.log(e)
      })
  }

  return page
}
