process.setMaxListeners(0)

const puppeteer = require('puppeteer');

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const addFcts = async (page) => {
  page.gotoUrl = async (url, noError) => {
    if (page.closed) { return }
    try {
      await page.goto(url, {
        timeout: 1000 * 60 * 5,
        // waitUntil: 'domcontentloaded'
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
      if (!noError) { throw 'error load ' + e }
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

  page.clk = async (selector, error) => {
    if (page.closed) { return }
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

  page.inst = async (selector, text, force) => {
    if (page.closed) { return }
    try {
      await page.wfs(selector, true)
      if (force) {
        await page.evaluate(({ selector, text }) => {
          document.querySelector(selector).value = text
        }, { selector, text })
      }
      else {
        await page.evaluate(selector => {
          document.querySelector(selector).value = ''
          document.querySelector(selector).focus()
        }, selector)
        await page.type(selector, text, { delay: 150 });
      }
      return true
    }
    catch (e) {
      throw 'Insert error ' + selector
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
      console.log('Get error ' + selector)
      return false
    }
  }

  page.getTime = async (timeLine, style) => {
    if (page.closed) { return }
    try {
      await page.waitFor(1000 + rand(2000))
      const time = await page.evaluate(({ timeLine, style }) => {
        return document.querySelector(timeLine) && document.querySelector(timeLine).style[style]
      }, { timeLine, style })

      return time
    }
    catch (e) {
      console.log('getTime error')
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
    let page2 = await page.bc.newPage()
    page2 = addFcts(page2)
    return page2
  }

  return page
}

module.exports = async (userDataDir, noCache, cspot) => {

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

  if (cspot) {
    const ua = '--user-agent=Mozilla/5.0 (Linux; Android 4.0.4; Galaxy Nexus Build/IMM76B) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.133 Mobile Safari/535.19'
    params.args.push(ua)
  }

  if (noCache && !cspot) {
    delete params.userDataDir
  }

  let browserContext

  // params.executablePath = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  let launch

  try {
    launch = await puppeteer.launch(params);
    browserContext = launch.defaultBrowserContext()
  }
  catch (e) {
    // console.log('BROWSER FAIL')
    //process.exit()
    return false
  }

  const pages = await browserContext.pages()
  let page = pages[0]

  page.bc = launch
  page.bcPages = async () => {
    const bcPages = await launch.pages()
    let page2 = bcPages[bcPages.length - 1]
    page2 = addFcts(page2)
    return pages
  }

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  await page.setRequestInterception(true);
  page.on('request', interceptedRequest => {
    if (interceptedRequest.url().endsWith('.png') || interceptedRequest.url().endsWith('.jpg'))
      interceptedRequest.abort();
    else
      interceptedRequest.continue();
  });

  page = addFcts(page)

  return page
}
