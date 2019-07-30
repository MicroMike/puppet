const Chromy = require('chromy')

async function main() {
    let chromy = new Chromy({
        visible: true
    })
    await chromy.goto('http://napster.com/')
    const result = await chromy.evaluate(() => {
        return document.querySelectorAll('*').length
    })
    console.log(result)
    //   await chromy.close()
}

main()