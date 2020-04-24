const puppeteer = require('puppeteer');

const main = async () => {

    const browser = await puppeteer.launch({ headless: false });
    const pages = await browser.pages()
    const page = pages[0]

    await page.goto('http://gestyy.com/w91ZBb');

    //   await browser.close();
}

main()