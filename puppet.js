process.setMaxListeners(0)

const puppeteer = require('puppeteer-core');

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
				await page.waitFor(1000 + rand(2000))
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
				await page.type(selector, text, { delay: 250 + rand(250) });
			}

			return true
		}
		catch (e) {
			if (!noError) {
				throw 'Insert error ' + selector
			}
		}
	}

	page.jInst = async (selector, text, type = false, noError = true) => {
		if (page.closed) { return }
		try {
			if (!noError) {
				await page.wfs(selector, true)
			}

			await page.evaluate(({ selector, text }) => {
				document.querySelector(selector).value = text
			}, { selector, text: type ? '' : text })

			if (type) {
				await page.type(selector, text, { delay: 250 + rand(250) });
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
			throw 'failedTime'
		}
	}

	page.getAppleTime = async () => {
		if (page.closed) { return }
		try {
			await page.waitFor(1000 + rand(2000))
			let time = await page.evaluate(() => {
				const times = document.querySelector('.web-chrome-playback-lcd__scrub').getAttribute('aria-valuetext').split(' ').filter(v => !isNaN(v))
				if (times.length > 1) {
					return Number(times[0]) * 60 + Number(times[1])
				}
				else {
					return Number(times[0])
				}
			})

			return time
		}
		catch (e) {
			console.log(e)
			throw 'failedTime'
		}
	}

	page.cls = async (noError) => {
		page.closed = true

		try {
			await page.goto('about:blank')
			await page.close()
			// await browserContext.browser().close()
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

module.exports = async (userDataDir, noCache = false, headless = false) => {

	const params = {
		executablePath: '/usr/bin/google-chrome-stable',
		userDataDir,
		headless,
		args: [
			'--no-sandbox',
			'--disable-setuid-sandbox',
			'--disable-gpu',
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
			params.executablePath = "/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome"
			launch = await puppeteer.launch(params);
			browserContext = launch.defaultBrowserContext()
		}
		catch (f) {
			// console.log(e)
			return false
		}
	}

	const pages = await browserContext.pages()
	const page = pages[0]

	page.cbc = async () => {
		const pagesR = await browserContext.pages()
		const pageR = pagesR[0]
		return pageR && addFcts(pageR)
	}

	await page.evaluateOnNewDocument(() => {
		Object.defineProperty(navigator, 'webdriver', {
			get: () => false,
		});
	});

	await page.setRequestInterception(true);
	page.on('request', interceptedRequest => {
		// console.log(interceptedRequest.url())
		// if (interceptedRequest.url().endsWith('.png') || interceptedRequest.url().endsWith('.jpg'))
		// 	interceptedRequest.abort();
		// else
		interceptedRequest.continue();
	});

	return page && addFcts(page)

}
