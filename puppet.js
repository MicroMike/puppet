const puppeteer = require('puppeteer');

process.setMaxListeners(Infinity)

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

module.exports = async (userDataDir, noCache) => {

  const params = {
    executablePath: '/usr/bin/google-chrome-stable',
    userDataDir,
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
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
    const launch = await puppeteer.launch(params);
    browserContext = launch.defaultBrowserContext()
  }
  catch (e) {
    // console.log('BROWSER FAIL')
    //process.exit()
    return false
  }

  const pages = await browserContext.pages()
  const page = pages[0]

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  // await page.setRequestInterception(true);
  // page.on('request', async request => {
  //   const requestUrl = await request.url()
  //   if (request.resourceType() === 'image' && !/svg$/.test(requestUrl)) {
  //     return request.abort(['blockedbyclient']);
  //   }
  //   request.continue();
  // });

  page.gotoUrl = async (url) => {
    try {
      await page.goto(url, { timeout: 1000 * 60 * 5, waitUntil: 'domcontentloaded' })
      return true
    } catch (e) {
      throw 'error load'
    }
  }

  page.wfs = async (selector, timeout = 1000 * 60 * 3, retry = false) => {
    try {
      await page.waitForSelector(selector, { timeout })
      return true
    } catch (e) {
      throw 'Selector error ' + selector
    }
  }

  page.ext = async (selector, timeout = 1000 * 10) => {
    try {
      await page.waitForSelector(selector, { timeout })
      return true
    } catch (error) {
      return false
    }
  }

  page.clk = async (selector, error) => {
    try {
      await page.wfs(selector)
      await page.waitFor(2000 + rand(2000))
      await page.evaluate(selector => {
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
    if (!exist) { return false }

    try {
      await page.waitFor(2000 + rand(2000))
      await page.evaluate(selector => {
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
      const elementHandle = await page.$(selector);
      await page.evaluate(selector => {
        document.querySelector(selector).value = ''
      }, selector)
      await elementHandle.type(text, { delay: 300 });

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
      const html = await page.evaluate(selector => {
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
      await page.goto('about:blank')
      await browserContext.browser().close()
    }
    catch (e) {
      throw 'Can\'t close', e
    }
  }

  return page
}
