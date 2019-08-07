process.setMaxListeners(0)

const puppeteer = require('puppeteer');

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

let browserContext
let launch

const addFcts = async (page) => {
  page.gotoUrl = async (url, noError) => {
    if (page.closed) { return }
    try {
      await page.goto(url, {
        timeout: 1000 * 60 * 5,
        waitUntil: 'domcontentloaded'
      })
      await page.waitFor(3000 + rand(2000))

      // setTimeout(async () => {
      //   try {
      //     await page.evaluate(() => {
      //       window.stop()
      //     })
      //   }
      //   catch (e) { }
      // }, 1000 * 60 * 3);

      return true
    } catch (e) {
      if (!noError) { throw 'error load ' + url + ' => ' + e }
    }
  }

  page.rload = async () => {
    if (page.closed) { return }
    try {
      await page.waitFor(5000 + rand(2000))
      await page.reload({ timeout: 1000 * 60 * 5 })
      return true
    } catch (e) {
      throw 'error reload'
    }
  }

  page.wfs = async (selector, error) => {
    if (page.closed) { return }
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
    if (page.closed) { return }
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

  page.clk = async (selector, error, noError) => {
    if (page.closed) { return }
    try {
      await page.waitFor(1000 + rand(2000))
      !noError && await page.wfs(selector, true)
      await page.evaluate(selector => {
        document.querySelector(selector) && document.querySelector(selector).click()
      }, selector)

      return true
    }
    catch (e) {
      if (!noError) {
        throw error || 'Click error ' + selector
      }
    }
  }

  page.jClk = async (selector, wait) => {
    if (page.closed) { return }
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

  page.inst = async (selector, text, type, noError) => {
    if (page.closed) { return }
    try {
      await page.wfs(selector, true)

      await page.evaluate(({ selector, text }) => {
        document.querySelector(selector).value = text
      }, { selector, text: type ? '' : text })

      if (type) {
        await page.type(selector, text, { delay: 150 });
      }

      return true
    }
    catch (e) {
      if (!noError) {
        throw 'Insert error ' + selector
      }
    }
  }

  page.get = async (selector, getter = 'innerHTML') => {
    if (page.closed) { return }
    try {
      await page.waitFor(1000 + rand(2000))
      const html = await page.evaluate(({ selector, getter }) => {
        return document.querySelector(selector) && document.querySelector(selector)[getter]
      }, { selector, getter })

      return html
    }
    catch (e) {
      throw 'Get error ' + selector + ' ' + e
    }
  }

  page.getTime = async (timeLine, callback) => {
    if (page.closed) { return }
    try {
      await page.waitFor(1000 + rand(2000))
      let time = await page.evaluate(timeLine => {
        return document.querySelector(timeLine) && document.querySelector(timeLine).innerText
      }, timeLine)

      time = time && callback(time)

      return time
    }
    catch (e) {
      console.log(e)
      return false
    }
  }

  page.cls = async (noError) => {
    page.closed = true

    try {
      await page.goto('about:blank')
      await browserContext.browser().close()
    }
    catch (e) {
      if (!noError) { throw ('Can\'t close', e) }
    }
  }

  page.onCls = callback => {
    callback()
  }

  page.on('error', function (err) {
    throw 'crashed'
  });

  page.np = async () => {
    if (page.closed) { return }
    let page2 = await launch.newPage()
    page2 = addFcts(page2)
    return page2
  }

  page.lastPage = async () => {
    const bcPages = await launch.pages()
    let page2 = bcPages[bcPages.length - 1]
    page2 = addFcts(page2)
    return page2
  }

  return page
}

module.exports = async (userDataDir, noCache) => {

  const params = {
    executablePath: '/usr/bin/google-chrome-stable',
    userDataDir,
    headless: false,
    args: [
      '--disable-timeouts-for-profiling',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
    timeout: 0,
    defaultViewport: {
      width: 851,
      height: 450,
    }
  }

  if (noCache) {
    delete params.userDataDir
  }

  try {
    launch = await puppeteer.launch(params);
    browserContext = launch.defaultBrowserContext()
  }
  catch (e) {
    try {
      params.executablePath = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
      launch = await puppeteer.launch(params);
      browserContext = launch.defaultBrowserContext()
    }
    catch (f) {
      console.log(e)
      return false
    }
  }

  const pages = await browserContext.pages()
  const page = pages[0]

  await page.setRequestInterception(true);
  page.on('request', interceptedRequest => {
    const regex = new RegExp('rhapsody|napster|amazon|tidal', 'i')
    const payRegex = new RegExp('v2.2\/events|amazon|playbackinfopostpaywall', 'i')
    const url = interceptedRequest.url()
    const data = interceptedRequest.postData()

    if (!regex.test(url)) {
      interceptedRequest.abort()
      console.log(url)
    }
    else {
      if (payRegex.test(url)) {
        console.log(url)
        console.log(data)
      }
      interceptedRequest.continue()
    }
  });

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  return page && addFcts(page)
}
