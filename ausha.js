process.setMaxListeners(Infinity)

const puppet = require('./puppet')

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const episodes = [
  'https://podcast.ausha.co/micro/tuto-strea',
  'https://podcast.ausha.co/micro/l-histoire-insolite-le-turc',
  'https://podcast.ausha.co/micro/le-go',
]

const run = async () => {
  let page

  try {
    page = await puppet('', true, true)
  }
  catch (e) { page = false }

  if (!page) {
    console.log(thread + ' no page')
  }
  else {
    await page.gotoUrl(episodes[rand(episodes.length)])
    await page.evaluate(() => {
      const play = document.querySelector('button[class^="PlayButton__"]')
      play && play.click()

      // setTimeout(() => {
      //   const volume = document.querySelector('[title="Volume"]')
      //   volume && volume.click()
      // }, 0);
    })
  }

  setTimeout(async () => {
    await run()
  }, 1000 * 5);

  await page.waitFor(1000 * 10)
  await page.cls(true)

}

run()
run()
run()
run()
run()
run()
run()
run()
run()
run()