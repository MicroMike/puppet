const puppeteer = require('puppeteer');

let exit = false;
process.on('SIGINT', () => {
    exit = true
})

const main = async () => {

    const browser = await puppeteer.launch({ headless: false });
    const pages = await browser.pages()
    const page = pages[0]

    await page.goto('http://gestyy.com/w91Mg8');

    try {
        await page.waitForSelector('.skip-btn.show', { timeout: 1000 * 10 })
        await page.waitFor(2000)
        await page.click('.skip-btn.show')
        await page.waitFor(1000 * 5)
    }
    catch (e) {
        await page.waitFor(1000 * 60)
    }

    await browser.close();

    setTimeout(async () => {
        !exit && await main()
    }, 2000);
}

main()