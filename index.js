const CDP = require('chrome-remote-interface');
const fs = require('fs');
const shell = require('shelljs');

const port = process.argv[2]
// const port = 1233
let N, P, R;

const connect = () => new Promise((resolve, reject) => {
	const loop = async () => {
		const ls = await shell.exec('chrome-remote-interface list --port=' + port, { silent: false })
		console.log(/Error/.test(ls.stderr))
		if (/Error/.test(ls.stderr)) {
			loop()
			console.log(ls.stderr)
		} else {
			resolve(ls.stdout)
		}
	}

	loop()
})

const expression = `var keyboardEvent = document.createEvent('KeyboardEvent');
var initMethod = typeof keyboardEvent.initKeyboardEvent !== 'undefined' ? 'initKeyboardEvent' : 'initKeyEvent';

keyboardEvent[initMethod](
  'keypress', // event type: keydown, keyup, keypress
  true, // bubbles
  true, // cancelable
  window.body, // view: should be window
  false, // ctrlKey
  false, // altKey
  false, // shiftKey
  false, // metaKey
  0, // keyCode: unsigned long - the virtual key code, else 0
  'a', // charCode: unsigned long - the Unicode character associated with the depressed key, else 0
);
document.dispatchEvent(keyboardEvent);`

const waitForSelector = (selector) => new Promise((res, rej) => {
	const loop = async () => {
		const el = await R.evaluate({ expression: 'document.querySelector(\'' + selector + '\')' })
		console.log(el)
		if (!el.result.objectId) {
			loop()
		} else {
			console.log(selector + ' found')
			res('ok')
		}
	}

	loop()

	setTimeout(() => {
		res('notOk')
	}, 30 * 1000);
})

const click = (selector) => new Promise(async (res, rej) => {
	const wfs = await waitForSelector(selector)
	if (wfs !== 'ok') { return }

	setTimeout(async () => {
		await R.evaluate({ expression: 'document.querySelectorAll(\'' + selector + '\')[0].click()' })
		res('ok')
	}, 3000);
})

const takeScreenshot = async (filename = 'sc.png') => {
	const { data } = await Page.captureScreenshot();
	fs.writeFileSync(filename, Buffer.from(data, 'base64'));
}

async function example() {
	// await shell.exec('"/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome" --no-first-run --user-data-dir="tidal' + port + '" --remote-debugging-port=' + port, { async: true })
	await shell.exec('google-chrome-stable --no-sandbox --disable-gpu --no-first-run --user-data-dir="tidal' + port + '" --remote-debugging-port=' + port, { async: true })

	await connect()

	const options = {
		host: '127.0.0.1',
		port
	}

	CDP(options, async (client) => {
		console.log('Connected!');

		try {
			// connect to endpoint
			client = await CDP(options);

			// extract domains
			const { Network, Page, Runtime } = client;
			N = Network;
			P = Page;
			R = Runtime;

			// setup handlers
			Network.requestWillBeSent((params) => {
				// console.log(params.request.url);
			});
			// enable events then start!
			await Network.enable();
			await Page.enable();
			await Page.navigate({ url: 'https://listen.tidal.com/album/88716570/track/88716580' });
			await Page.loadEventFired();

			// await shell.exec('osascript space.scpt')

			const wfs = await waitForSelector('[datatest="no-user--signup"]')

			if (wfs === 'ok') {
				await click('[datatest="no-user--signup"]')
				await waitForSelector('#email')
				await takeScreenshot()
			} else {
				await click('[data-test="shuffle-all"]')
			}
		} catch (err) {
			console.error(err);
		} finally {
			if (client) {
				// await client.close();
			}
		}

		// client.close();
	}).on('error', (err) => {
		console.error(err);
	});

}

example();