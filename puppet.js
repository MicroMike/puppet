process.setMaxListeners(0)

const puppeteer = require('puppeteer');
const Chromy = require('chromy')

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

let browserContext
let launch

const addFcts = async (page) => {
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

module.exports = async (userDataDir, noCache, create = false) => {

  // const params = {
  //   executablePath: '/usr/bin/google-chrome-stable',
  //   userDataDir,
  //   headless: false,
  //   args: [
  //     '--no-sandbox',
  //     '--disable-setuid-sandbox',
  //     // '--user-agent=Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2114.2 Safari/537.36'
  //   ],
  //   defaultViewport: {
  //     width: 851,
  //     height: 450,
  //   }
  // }

  // try {
  //   launch = await puppeteer.launch(params);
  //   browserContext = launch.defaultBrowserContext()
  // }
  // catch (e) {
  //   try {
  //     params.executablePath = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  //     launch = await puppeteer.launch(params);
  //     browserContext = launch.defaultBrowserContext()
  //   }
  //   catch (f) {
  //     console.log(e)
  //     return false
  //   }
  // }

  // const pages = await browserContext.pages()
  // const page = pages[0]

  // await page.evaluateOnNewDocument(() => {
  //   Object.defineProperty(navigator, 'webdriver', {
  //     get: () => false,
  //   });
  // });

  let params = {
    visible: true,
    // chromePath: '/usr/bin/google-chrome-stable',
    chromeFlags: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=851,450'
    ],
    waitTimeout: 1000 * 60
  }

  let page = new Chromy(params)

  if (!noCache) {
    await page.setCookie({ path: userDataDir +'/Default/Cookies'})
  }

  page.gotoUrl = async (url, noError) => {
    if (page.closed) { return }
    try {
      await page.goto(url, {
        timeout: 1000 * 60 * 5,
        waitUntil: 'domcontentloaded'
      })
      await page.wait(3000 + rand(2000))

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
      await page.wait(5000 + rand(2000))
      await page.reload({ timeout: 1000 * 60 * 5 })
      return true
    } catch (e) {
      throw 'error reload'
    }
  }

  page.wfs = async (selector, error) => {
    if (page.closed) { return }
    try {
      await page.wait(1000 + rand(2000))
      await page.wait(selector)
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
      await page.wait(1000 + rand(2000))
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
      await page.wait(1000 + rand(2000))
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
      await page.wait(1000 + rand(2000))
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
      await page.wait(1000 + rand(2000))
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

  return !create ? page : addFcts(page)

  //   await page.setRequestInterception(true);
  //   page.on('request', interceptedRequest => {
  //     if (interceptedRequest.url().endsWith('.png') || interceptedRequest.url().endsWith('.jpg'))
  //       interceptedRequest.abort();
  //     else
  //       interceptedRequest.continue();
  //   });
}
