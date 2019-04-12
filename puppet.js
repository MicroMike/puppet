process.setMaxListeners(0)

const puppeteer = require('puppeteer');

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

module.exports = async (userDataDir, noCache, socket) => {

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
      await page.goto(url, { timeout: 1000 * 60 * 5 })
      await page.waitFor(1000 + rand(2000))
      return true
    } catch (e) {
      throw 'error load'
    }
  }

  page.rload = async () => {
    try {
      await page.waitFor(5000 + rand(2000))
      await page.reload({ timeout: 1000 * 60 * 5 })
      return true
    } catch (e) {
      throw 'error reload'
    }
  }

  page.wfs = async (selector, error) => {
    try {
      await page.waitFor(1000 + rand(2000))
      await page.waitForSelector(selector, { timeout: 1000 * 60 })
      return true
    } catch (e) {
      if (error) {
        throw 'Selector error ' + selector
      }
      else {
        return false
      }
    }
  }

  page.ext = async (selector) => {
    try {
      await page.waitFor(1000 + rand(2000))
      const exist = await page.evaluate(selector => {
        return !!document.querySelector(selector)
      }, selector)
      return exist
    } catch (error) {
      return false
    }
  }

  page.clk = async (selector, error) => {
    try {
      await page.waitFor(1000 + rand(2000))
      await page.wfs(selector, true)
      await page.evaluate(selector => {
        document.querySelector(selector) && document.querySelector(selector).click()
      }, selector)

      return true
    }
    catch (e) {
      throw error || 'Click error ' + selector
    }
  }

  page.jClk = async (selector, wait) => {
    try {
      let exist

      if (wait) {
        exist = await page.wfs(selector)
      }
      else {
        exist = await page.ext(selector)
      }

      if (exist) {
        await page.evaluate(selector => {
          document.querySelector(selector) && document.querySelector(selector).click()
        }, selector)
        return true
      }
      return false
    }
    catch (e) {
      console.log('Justclick ' + selector)
      return false
    }
  }

  page.inst = async (selector, text) => {
    try {
      await page.wfs(selector, true)
      await page.evaluate(selector => {
        document.querySelector(selector).value = ''
        document.querySelector(selector).focus()
      }, selector)
      await page.type(selector, text, { delay: 150 });
      return true
    }
    catch (e) {
      throw 'Insert error ' + selector
    }
  }

  page.get = async (selector, getter = 'innerHTML') => {
    try {
      await page.waitFor(1000 + rand(2000))
      const html = await page.evaluate(({ selector, getter }) => {
        return document.querySelector(selector) && document.querySelector(selector)[getter]
      }, { selector, getter })

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
