module.exports = async (socket, page, parentId, streamId, check, account) => {
	return new Promise(async (r) => {
		try {
			const CDP = require('chrome-remote-interface');
			const fs = require('fs');
			const shell = require('shelljs');
			const image2base64 = require('image-to-base64');
			const request = require('ajax-request');
			// const captcha = require('./captcha')

			const [player, login, pass] = account.split(':')
			const isTidal = player === 'tidal'

			const al = require('./albums')
			let albums = al[player]
			let currentAlbum
			let time = 0
			let nextMusic = false
			let countPlays = 0

			const S = {
				noNeedLog: '[class*="badgeContainer"]',
				gotoLog: '[datatest="no-user--signup"]',
				loginError: '.box-error',
				email: '#email',
				pass: '#password',
				connectBtn: '.btn-success.btn-client-primary',
				play: '[data-test="shuffle-all"]',
				timeLine: '[data-test="current-time"]',
				callback: a => (a.split(':').reduce((a, b) => a * 60 + Number(b))),
			}

			if (player === 'spotify') {
				S.noNeedLog = '[data-testid="user-widget-link"]'
				S.gotoLog = '[data-testid="login-button"]'
				S.loginError = '.alert.alert-warning'
				S.email = '#login-username'
				S.pass = '#login-password'
				S.connectBtn = '#login-button'
				S.play = '[data-testid="play-button"]'
				S.timeLine = '[data-testid="playback-position"]'

				// S.repeatBtn = '[class*="spoticon-repeat"]'
				// S.repeatBtnOk = '.spoticon-repeat-16.control-button--active'
				// S.shuffleBtn = '.spoticon-shuffle-16:not(.control-button--active)'
				// S.nextBtn = '.spoticon-skip-forward-16'
				// S.usedDom = '.ConnectBar'
			}

			const album = () => {
				let albumUrl = albums[rand(albums.length)]
				while (currentAlbum === albumUrl) {
					albumUrl = albums[rand(albums.length)]
				}
				currentAlbum = albumUrl
				return albumUrl
			}

			const rand = (max, min = 0) => {
				return Math.floor(Math.random() * Math.floor(max)) + 1 + min;
			}

			const takeScreenshot = async (e) => {
				const filename = 'screenshot/' + (e || '') + '-' + login + '.png'

				const { data } = await P.captureScreenshot();
				fs.writeFileSync(filename, Buffer.from(data, 'base64'));

				try {
					img = await image2base64(filename)
				}
				catch (e) { }

				socketEmit('screen', { img, log: login + ' => ' + e })
			}

			const port = rand(1000, 8000)
			let C, N, P, R, D, B;
			let countStream, streamOn;
			const keyCaptchaHuman = '6LccSjEUAAAAANCPhaM2c-WiRxCZ5CzsjR_vd8uX'

			const connect = () => new Promise((resolve, reject) => {
				const loop = async () => {
					const ls = await shell.exec('chrome-remote-interface list --port=' + port, { silent: true })
					if (/Error/.test(ls.stderr)) {
						loop()
					} else {
						resolve(ls.stdout)
					}
				}

				loop()
			})

			const waitForSelector = (selector) => new Promise((res, rej) => {
				const loop = async () => {
					const el = await R.evaluate({ expression: 'document.querySelector(\'' + selector + '\')' })
					if (!el.result.objectId) {
						loop()
					} else {
						res(true)
					}
				}

				loop()

				setTimeout(() => {
					res(false)
				}, 5 * 1000);
			})

			const click = (selector) => new Promise(async (res, rej) => {
				const wfs = await waitForSelector(selector)
				if (wfs !== true) {
					res(false)
					return
				}

				await wait(3000)

				await R.evaluate({ expression: 'document.querySelectorAll(\'' + selector + '\')[0].click()' })
				res(true)
			})

			const wait = (time) => new Promise(async (res, rej) => {
				setTimeout(async () => {
					res(true)
				}, time);
			})

			// const typeLetter = (key) => `tell application "System Events"
			// 													keystroke ${key}
			// 													delay 1
			// 												end tell`

			// const typeKey = (e) => new Promise(async (res, rej) => {
			// 	await wait(1000)
			// 	await shell.exec('osascript -e \'' + typeLetter(e) + '\'', { silent: false })
			// 	res(true)
			// })

			const type = (value, selector) => new Promise(async (res, rej) => {
				await waitForSelector(selector)
				await wait(5000)

				const randVar = rand(1000)

				const typeExpression = `
				const setValue${randVar} = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
				const event${randVar} = new Event('input', { bubbles: true });
		
				setValue${randVar}.call(document.querySelector('${selector}'), '${value}');
				document.querySelector('${selector}').dispatchEvent(event${randVar});
				`
				await R.evaluate({ expression: typeExpression })
				res(true)
			})

			const get = async (selector, getter = 'innerHTML') => {
				await wait(1000)

				const expression = `document.querySelector(${selector}) && document.querySelector(${selector})[${getter}]`

				const { result } = await R.evaluate({ expression })
				return result.value
			}

			const getTimePlayer = async () => {
				await wait(1000 + rand(2000))
				let { result } = await R.evaluate({ expression: `document.querySelector('${S.timeLine}') && document.querySelector('${S.timeLine}').innerText` })
				const timeNow = result.value && S.callback(result.value)
				time = timeNow
			}

			const playCheck = async () => {
				await getTimePlayer()

				const { result } = await R.evaluate({ expression: '/interrompue/.test(document.body.innerHTML)' })

				if (isTidal && result.value) {
					console.log('playStop', result.value)
					catchFct('used')
					return
				}

				const matchTime = Number(time)

				if (matchTime && matchTime > 30) {
					if (!nextMusic) {
						nextMusic = true
						let nextOk = false
						countPlays++

						const clickNext = rand(2) &&
							(currentAlbum === 'https://listen.tidal.com/album/88716570')
							|| (currentAlbum === 'https://music.amazon.fr/albums/B07CZDXC9B')

						if (clickNext) {
							// nextOk = true
							// await page.jClk(nextBtn)
						}

						socketEmit('plays', { next: nextOk, currentAlbum, matchTime, countPlays })
						socketEmit('playerInfos', { time, ok: true, countPlays })
					}
				}
				else {
					nextMusic = false
				}

				await wait(3000)
				await playCheck()
			}

			const emailCheck = async () => {
				const hasEmailInput = await waitForSelector(S.email)
				if (hasEmailInput) {
					await wait(rand(5000))
					return true
				}
				await emailCheck()
			}

			const goToPage = async (url) => {
				await P.navigate({ url });
				await P.loadEventFired();

				// const corectLoad = await waitForSelector('.sidebarWrapper')

				// if (corectLoad) {
				await wait(1000)
				return true
				// }

				// await goToPage(url)
			}

			const socketEmit = (event, params) => {
				socket.emit(event, {
					parentId,
					streamId,
					account,
					...params,
				});
			}

			const exit = async (e) => {
				if (e !== 'loop') {
					socket.emit('log', parentId + ' - out: ' + account + ' => ' + e)
				}

				B && B.close()

				r(socket)
			}

			socket.on('forceOut', () => {
				exit('forceOut')
			})

			const stream = async () => {
				await takeScreenshot('stream')
				await wait(3000)

				countStream++

				if (countStream > 30) {
					streamOn = false
				}

				if (streamOn) { stream() }
			}

			const startStream = () => {
				countStream = 0
				streamOn = true

				stream()
			}

			socket.on('screenshot', () => {
				takeScreenshot('getScreen')
			})

			socket.on('streamOn', startStream)

			socket.on('streamOff', () => {
				streamOn = false
			})

			const logError = (e) => {
				socket.emit('log', account + ' => ' + e)
			}

			const getTime = () => {
				const date = new Date
				return date.getUTCHours() + 1 + 'H' + date.getUTCMinutes()
			}

			const catchFct = async (e) => {
				let code = 5

				code = e === 'loop' ? 1 : code
				code = e === 'freeze' ? 2 : code
				code = e === 'check' ? 3 : code
				code = e === 'del' ? 4 : code
				code = e === 'tidalError' ? 6 : code
				code = e === 'amazonError' ? 6 : code
				code = e === 'spotifyError' ? 6 : code
				code = e === 'used' ? 7 : code
				code = e === 'firstPlay' ? 210 : code
				code = e === 'failedLoop' ? 210 : code
				code = e === 'failedTime' ? 210 : code
				code = e === 'logout' ? 220 : code

				// code = e === 'retry' ? 5 : code
				// code = e === 'crashed' ? 6 : code
				// code = e === 'error' ? 7 : code
				// code = e === 'fillForm' ? 5 : code
				// code = e === 'login' ? 9 : code
				// code = e === 'nobar' ? 10 : code

				if (code === 1) {
					socketEmit('retryOk')
				}

				if (code === 6 && e !== 'spotifyError') {
					request('http://173.249.43.6:3000' + '/error?check/' + account, function (error, response, body) { })
				}

				if (code >= 4 && code !== 7 && code !== 220) {
					socket.emit('outLog', e)
					logError(e)
					console.log(getTime() + " ERR ", account, e)
					await takeScreenshot(e)
				}

				if (code === 4) {
					request('http://173.249.43.6:3000' + '/error?del/' + account, function (error, response, body) { })
				}
				else if (code === 7) {
					socketEmit('used')
				}

				exit(e)
			}

			socketEmit('playerInfos', { time: 'RUN', other: true })
			// --window-size=5,5
			await shell.exec('"/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome" --mute-audio --disable-features=Translate --no-first-run --user-data-dir="saveCookie/' + account + '" --remote-debugging-port=' + port, { async: true, silent: true })
			// await shell.exec('"/Applications/Chromium.app/Contents/MacOS/Chromium" --mute-audio --disable-features=Translate --no-first-run --user-data-dir="saveCookie/' + account + '" --remote-debugging-port=' + port, { async: true })
			// await shell.exec('google-chrome-stable --no-sandbox --disable-gpu --no-first-run --user-data-dir="tidal' + port + '" --remote-debugging-port=' + port, { async: true })

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
					C = client

					// extract domains
					const { Network, Page, Runtime, DOM, Input, Browser } = client;
					N = Network;
					P = Page;
					R = Runtime;
					D = DOM;
					B = Browser;

					// setup handlers
					Network.requestWillBeSent((params) => {
						// console.log(params.request.url);
					});
					// enable events then start!
					await Network.enable();
					await Page.enable();
					await goToPage(album())

					const noNeedLog = await waitForSelector(S.noNeedLog)

					if (!noNeedLog) {
						await click(S.gotoLog)

						const hasEmailInput = await waitForSelector(S.email)

						if (!hasEmailInput) {
							await emailCheck()
						}

						await type(login, S.email)

						isTidal && await click('#recap-invisible')

						await type(pass, S.pass)

						await click(S.connectBtn)

						const error = await waitForSelector(S.loginError)
						if (error) {
							catchFct('del')
						}
					}

					const logSuccess = await waitForSelector(S.noNeedLog)
					if (!logSuccess) {
						catchFct('tidalError')
					}

					socketEmit('playerInfos', { time: 'CONNECT', other: true })

					await click('#onetrust-accept-btn-handler')

					await wait(rand(3000, 1000))

					Input.dispatchMouseEvent({
						type: 'mousePressed',
						button: 'left',
						x: 315,
						y: 390
					})

					await wait(rand(3000, 1000))
					await click(S.play)
					await wait(rand(3000, 1000))

					socketEmit('playerInfos', { time: 'PLAY', ok: true })

					if (isTidal) {
						const delTidal = await get('.ReactModal__Overlay', 'innerText')
						if (/expired/.test(delTidal)) {
							catchFct('del')
						}

						let repeat = await waitForSelector('[data-type="button__repeatAll"]')
						while (!repeat) {
							await click('[data-test="repeat"]')
							repeat = await waitForSelector('[data-type="button__repeatAll"]')
						}
					}

					await playCheck()
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
		catch (e) {
			console.log(e)
			r(socket)
		}
	})
}