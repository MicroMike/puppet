const puppeteer = require('puppeteer');

let exit = false;
process.on('SIGINT', () => {
    exit = true
})

const main = async () => {

    const browser = await puppeteer.launch({ headless: false });
    const pages = await browser.pages()
    const page = pages[0]

    await page.goto('http://gestyy.com/w91ZBb');
    await page.waitForSelector('.skip-btn.show')
    await page.waitFor(2000)
    await page.click('.skip-btn.show')

    await browser.close();

    setTimeout(() => {
        !exit && await main()
    }, 2000);
}

await main()