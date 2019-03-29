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
    waitTimeout: 1000 * 60 * 3,
    show: true,
    typeInterval: 300,
    webPreferences: {
      // partition: persist,
      webSecurity: false,
      allowRunningInsecureContent: true,
      plugins: true,
      images: false,
      experimentalFeatures: true
    }
  })

  nightmare.goto('http://google.fr')

  let page = {}

  page.waitFor = async (timeOrSelector) => {
    try {
      nightmare.wait(timeOrSelector)
    }
    catch (e) {
      throw 'Can\'t close', e
    }
  }

  page.gotoUrl = async (url) => {
    try {
      // await page.goto(url, { timeout: 1000 * 60 * 5, waitUntil: 'domcontentloaded' })
      await nightmare.goto(url)
      return true
    } catch (e) {
      throw 'error load'
    }
  }

  page.wfs = async (selector, timeout = 1000 * 60 * 3, retry = false) => {
    try {
      // await page.waitForSelector(selector, { timeout })
      await page.waitFor(selector)
      return true
    } catch (e) {
      throw 'Selector error ' + selector
    }
  }

  page.ext = async (selector, timeout = 1000 * 10) => {
    try {
      // await page.waitForSelector(selector, { timeout })
      await page.waitFor(selector)
      return true
    } catch (error) {
      return false
    }
  }

  page.clk = async (selector, error) => {
    try {
      await page.wfs(selector)
      await page.waitFor(2000 + rand(2000))
      await nightmare.evaluate(selector => {
        document.querySelector(selector) && document.querySelector(selector).click()
      }, selector)

      return true
    }
    catch (e) {
      throw error || 'Click error ' + selector
    }
  }

  page.jClk = async (selector) => {
    const exist = await page.ext(selector)
    if (!exist) {
      if (selector) {
        console.log(selector + ' don\'t exist')
      }
      return false
    }

    try {
      await page.waitFor(2000 + rand(2000))
      await nightmare.evaluate(selector => {
        document.querySelector(selector) && document.querySelector(selector).click()
      }, selector)
      return true
    }
    catch (e) {
      console.log('Justclick ' + selector)
    }
  }

  page.inst = async (selector, text) => {
    try {
      await page.waitFor(2000 + rand(2000))
      await page.clk(selector)
      // const elementHandle = await page.$(selector);
      await nightmare.evaluate(selector => {
        document.querySelector(selector).value = ''
      }, selector)
      // await elementHandle.type(text, { delay: 300 });
      await nightmare.type(selector, text);

      return true
    }
    catch (e) {
      throw 'Insert error ' + selector
    }
  }

  page.get = async (selector) => {
    const ext = await page.ext(selector)
    if (!ext) { return false }

    try {
      await page.waitFor(2000 + rand(2000))
      const html = await nightmare.evaluate(selector => {
        return document.querySelector(selector) && document.querySelector(selector).innerHTML
      }, selector)

      return html
    }
    catch (e) {
      console.log('Get error ' + selector)
      return false
    }
  }

  page.cls = async () => {
    try {
      // await page.goto('about:blank')
      // await browserContext.browser().close()
      nightmare.end()
    }
    catch (e) {
      throw 'Can\'t close', e
    }
  }

  return page
}
