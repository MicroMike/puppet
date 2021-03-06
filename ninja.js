const puppeteer = require('puppeteer');

let exit = false;
process.on('SIGINT', () => {
  exit = true
  process.exit()
})

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const urls = [
  "tripadvisor.com",
  "qq.com",
  "fastcompany.com",
  "amazon.com",
  "shop-pro.jp",
  "flavors.me",
  "npr.org",
  "arstechnica.com",
  "pinterest.com",
  "bloglines.com",
  "deliciousdays.com",
  "qq.com",
  "feedburner.com",
  "github.com",
  "nsw.gov.au",
  "cornell.edu",
  "columbia.edu",
  "paypal.com",
  "google.es",
  "deliciousdays.com"
]

let count = 0

const main = async () => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
      ],
    });
    const pages = await browser.pages()
    const page = pages[0]

    await page.goto('http://sh.st/st/445f592bec4c2e1aaa4e0c4ad0c22836/' + urls[count]);

    await page.waitForSelector('.skip-btn.show', { timeout: 1000 * 30 })
    await page.waitFor(2000)
    await page.click('.skip-btn.show')
    await page.waitFor(1000 * 5)

    count++

    if (count === 5) {
      browser && await browser.close()
      exit = true
      process.exit()
    }

    console.log('done')
  }
  catch (e) {
    console.log('recaptcha error')
    browser && await browser.close()
  }

  browser && await browser.close();

  setTimeout(async () => {
    !exit && await main()
  }, 2000);
}

main()