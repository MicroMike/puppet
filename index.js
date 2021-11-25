module.exports = async (socket, page, parentId, streamId, check, account) => {
	return new Promise(async (r) => {
		const CDP = require('chrome-remote-interface');
		const fs = require('fs');
		const shell = require('shelljs');
		const image2base64 = require('image-to-base64');
		const request = require('ajax-request');
		const al = require('./albums')

		let closed = false
		let C, N, P, R, D, B, I, T;
		let targetId = false;
		let timeout

		const [player, login, pass] = account.split(':')
		const isTidal = player === 'tidal'
		const isSpotify = player === 'spotify'

		let albums = al[player]
		let currentAlbum

		let time = 0
		let nextMusic = false
		let countPlays = 0
		let countPlaysLoop = 0
		let currTime = 0
		let pauseCount = 0
		let firstPlay = true
		let usedCount = 0

		const S = {
			noNeedLog: '[class*="badgeContainer"]',
			gotoLog: '[data-test="no-user--login"]',
			loginError: '.box-error',
			email: '#email',
			pass: '#password',
			connectBtn: '.btn-success.btn-client-primary',
			play: '[data-test="shuffle-all"]',
			timeLine: '[data-test="current-time"]',
			callback: a => (a.split(':').reduce((a, b) => a * 60 + Number(b))),
			nextBtn: '[data-test="next"]'
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

		const socketEmit = (event, params) => {
			socket.emit(event, {
				parentId,
				streamId,
				account,
				...params,
			});
		}

		const logError = (e) => {
			socket.emit('log', account + ' => ' + e)
		}

		const getTime = () => {
			const date = new Date
			return date.getUTCHours() + 1 + 'H' + date.getUTCMinutes()
		}

		const exit = async (e, code) => {
			if (e !== 'loop') {
				socket.emit('log', parentId + ' - out: ' + account + ' => ' + e)
			}

			B && B.close()

			shell.exec('node saveCookies.js ' + login, { silent: true })
			r(code)
		}

		const takeScreenshot = async (e) => {
			try {
				const filename = 'screenshot/' + (e || '') + '-' + login + '.png'
				const { data } = await P.captureScreenshot();
				fs.writeFileSync(filename, Buffer.from(data, 'base64'));

				img = await image2base64(filename)
				socketEmit('screen', { img, log: login + ' => ' + e })
			}
			catch (e) { }
		}

		const catchFct = async (e) => {
			closed = true
			clearTimeout(timeout)

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
				request('http://216.158.239.199:3000' + '/error?check/' + account, function (error, response, body) { })
			}

			if (code >= 4 && code !== 7 && code !== 220) {
				socket.emit('outLog', e)
				logError(e)
				console.log(getTime() + " ERR ", account, e)
				await takeScreenshot(e)
			}

			if (code === 4) {
				request('http://216.158.239.199:3000' + '/error?del/' + account, function (error, response, body) { })
			}
			else if (code === 7) {
				socketEmit('used')
			}

			exit(e, code)
		}

		timeout = setTimeout(() => {
			catchFct('tooLong')
		}, 2 * 60 * 1000);

		try {
			const album = () => {
				let albumUrl = albums[rand(albums.length)]
				// while (currentAlbum === albumUrl) {
				// 	albumUrl = albums[rand(albums.length)]
				// }
				currentAlbum = albumUrl
				return albumUrl
			}

			const rand = (max, min = 0) => {
				return Math.floor(Math.random() * Math.floor(max)) + 1 + min;
			}

			const port = rand(1000, 8000)
			let countStream, streamOn;
			const keyCaptchaHuman = '6LccSjEUAAAAANCPhaM2c-WiRxCZ5CzsjR_vd8uX'

			const connect = () => new Promise((resolve, reject) => {
				try {
					const loop = async () => {
						const ls = await shell.exec('chrome-remote-interface list --port=' + port, { silent: true })
						if (/Error/.test(ls.stderr)) {
							loop()
						} else {
							resolve(ls.stdout)
							return
						}
					}

					loop()
				} catch (error) {
					if (!closed) {
						catchFct(error)
					}
				}
			})

			const waitForSelector = (selector, time = 60) => new Promise((res, rej) => {
				const loop = async () => {
					try {
						const el = R && await R.evaluate({ expression: 'document.querySelector(\'' + selector + '\')' })

						if (!el.result.objectId) {
							loop()
						} else {
							res(true)
						}
					} catch (error) {
						if (!closed) {
							catchFct(error)
						}
					}
				}

				loop()

				setTimeout(() => {
					res(false)
				}, time * 1000);
			})

			const click = (selector, time) => new Promise(async (res, rej) => {
				try {
					const wfs = await waitForSelector(selector, time)

					if (wfs !== true) {
						res(false)
						return
					}

					await wait(3000)
					await R.evaluate({ expression: 'document.querySelectorAll(\'' + selector + '\')[0].click()' })

					res(true)
				} catch (error) {
					if (!closed) {
						catchFct(error)
					}
				}
			})

			const wait = (time) => new Promise(async (res, rej) => {
				setTimeout(async () => {
					res(true)
				}, time);
			})

			const type = (value, selector) => new Promise(async (res, rej) => {
				try {
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
				} catch (error) {
					if (!closed) {
						catchFct(error)
					}
				}
			})

			const get = async (selector, getter = 'innerHTML') => {
				try {
					await wait(1000)

					const expression = `document.querySelector('${selector}') && document.querySelector('${selector}')['${getter}']`
					const { result } = await R.evaluate({ expression })

					return result.value
				} catch (error) {
					if (!closed) {
						catchFct(error)
					}
				}
			}

			const getTimePlayer = async () => {
				try {
					let { result } = await R.evaluate({ expression: `document.querySelector('${S.timeLine}') && document.querySelector('${S.timeLine}').innerText` })
					const timeNow = result.value && S.callback(result.value)
					time = timeNow
				} catch (error) {
					if (!closed) {
						catchFct(error)
					}
				}
			}

			const emailCheck = async () => {
				try {
					// await T.activateTarget(targetId)
					const hasEmailInput = await waitForSelector(S.email)

					if (hasEmailInput) {
						await wait(rand(5000))
						return true
					}

					const bodyText = await get('body', 'textContent');

					if (/502 Bad Gateway/i.test(bodyText)) {
						album()
						await goToPage(currentAlbum)
						await wait(rand(3000, 1000))
					}

					await emailCheck()
				} catch (error) {
					if (!closed) {
						catchFct(error)
					}
				}
			}

			const goToPage = async (url) => {
				try {
					await P.navigate({ url: url || album() });
					await P.loadEventFired();

					await wait(5000)

					const body = await get('body', 'innerText')
					const corectLoad = /rechercher|écouter|listen now|tracks|shuffle|playing|home|robot|Accueil/i.test(body)

					if (corectLoad) {
						return true
					}

					await goToPage(url)
				} catch (error) {
					if (!url) {
						album()
						goToPage()
					} else if (!closed) {
						console.log('navigate', url)
						catchFct(error)
					}
				}
			}

			socket.on('forceOut', () => {
				exit('forceOut')
			})

			socket.on('Cdisconnect', () => {
				close = true
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

			socketEmit('playerInfos', { time: 'RUN', other: true })

			const connectedCheck = async () => {
				try {
					const { result } = await R.evaluate({ expression: '/interrompue|paused because/i.test(document.body.innerHTML)' })

					if (isTidal && result.value) {
						await click('[data-test="notification-close"]', 1)
						// console.log('playStop', account)
						usedCount++

						if (usedCount >= 3) {
							console.log('playStop 3 times', account)
							throw 'used'
						}

						await loopConnect()
						return
					}

					const result2 = await R.evaluate({ expression: '/Votre abonnement a expiré|Choisissez un abonnement/i.test(document.body.innerHTML)' })

					if (isTidal && result2.result.value) {
						throw 'del'
					}
				} catch (error) {
					if (!closed) {
						catchFct(error)
					}
				}
			}

			const playCheck = async () => {
				try {
					await connectedCheck();

					await getTimePlayer()

					if (isTidal) {
						let repeat = await waitForSelector('[data-type="button__repeatAll"]', 1)
						if (!repeat) {
							await click('[data-test="repeat"]', 1)
						}
					}

					if (isSpotify) {
						let repeat = await waitForSelector('[data-testid="control-button-repeat"][aria-checked="false"]', 1)
						if (repeat) {
							await click('[data-testid="control-button-repeat"]', 1)
						}
					}

					const matchTime = Number(time)

					if (currTime === matchTime) {
						// console.log(login, currTime, matchTime)
						pauseCount++
					} else {
						currTime % 2 === 0 && socketEmit('playerInfos', { time, ok: true, countPlays })
						pauseCount = 0
					}

					if (pauseCount && pauseCount < 5) {
						socketEmit('playerInfos', { time, freeze: true, warn: true, countPlays })
					}
					if (pauseCount === 5) {
						socketEmit('playerInfos', { time, freeze: true, countPlays })
					}

					if (pauseCount === 10) {
						pauseCount = 0
						console.log(login, 'freeze')
						throw 'freeze'
						// await click(S.play)
						// return
					}

					currTime = matchTime

					if (matchTime && matchTime > 30) {
						if (!nextMusic) {
							nextMusic = true
							let nextOk = false
							countPlays++

							// await T.activateTarget(targetId)

							const clickNext = rand(2)
								&&
								(currentAlbum === 'https://listen.tidal.com/album/88716570')
								|| (currentAlbum === 'https://music.amazon.fr/albums/B07CZDXC9B')

							if (clickNext && S.nextBtn) {
								nextOk = true
								await click(S.nextBtn)
							}

							socketEmit('plays', { next: nextOk, currentAlbum, matchTime, countPlays })
						}
					}
					else {
						nextMusic = false
					}

					// socketEmit('playerInfos', { time, ok: true, countPlays })

					request('http://216.158.239.199:3000' + '/checkOk?' + account, async (error, response, body) => { })

					if (check) {
						catchFct('check')
						return
					}

					if (nextMusic && countPlays > 10) {
						countPlays = 0
						countPlaysLoop++
						await loopConnect()
						return
					}

					if (nextMusic && countPlaysLoop > 15) {
						catchFct('logout')
						return
					}

					clearTimeout(timeout)

					await wait(3000)
					await click('[data-test="notification-close"]', 1)
					await playCheck()
				} catch (error) {
					if (!closed) {
						catchFct(error)
					}
				}
			}

			const loopConnect = async () => {
				try {
					album()
					await goToPage(currentAlbum)

					const noNeedLog = await waitForSelector(S.noNeedLog, check ? 1 : 10)

					if (!noNeedLog) {
						// if (!check) {
						// 	throw 'tidalError';
						// }
						// else {
						await click(S.gotoLog)

						const hasEmailInput = await waitForSelector(S.email)

						if (!hasEmailInput) {
							await emailCheck()
						}

						clearTimeout(timeout)

						await type(login, S.email)

						isTidal && await click('#recap-invisible')

						await type(pass, S.pass)

						await click(S.connectBtn)

						const error = await waitForSelector(S.loginError, 10)
						// const { result } = await R.evaluate({ expression: '/essayer gratuitement/i.test(document.body.innerHTML)' })

						if (error) {
							if (isTidal) {
								throw 'del'
							}
							throw 'out'
						}
						// }
					}

					await wait(rand(3000, 1000))

					const logSuccess = await waitForSelector(S.noNeedLog, 30)
					if (!logSuccess) {
						await wait(rand(3000, 1000))
						if (isTidal) {
							throw 'tidalError'
						}
						throw 'out'
					}

					socketEmit('playerInfos', { time: 'CONNECT', other: true })

					isSpotify && await click('#onetrust-accept-btn-handler', 5)

					await wait(rand(3000, 1000))

					I.dispatchMouseEvent({
						type: 'mousePressed',
						button: 'left',
						x: 315,
						y: 390
					})

					await wait(rand(3000, 1000))
					await click(S.play)
					await wait(rand(3000, 1000))

					/* 	if (firstPlay) {
							firstPlay = false
							setTimeout(() => {
								catchFct('out')
							}, 1000 * 60 * 15);
						} */

					socketEmit('playerInfos', { time: 'PLAY', ok: true })

					if (isTidal) {
						const delTidal = await get('.ReactModal__Overlay', 'innerText')
						if (/expired/.test(delTidal)) {
							throw 'del'
							return
						}
					}

					await playCheck()
				} catch (error) {
					if (!closed) {
						catchFct(error)
					}
				}
			}

			// await shell.exec('"C:/Program Files (x86)/Google/Chrome/Application/chrome.exe" --mute-audio --disable-features=Translate --no-first-run --user-data-dir="/puppet/saveCookie/' + login + '" --remote-debugging-port=' + port, { async: true, silent: true })
			// await shell.exec('"/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome" --mute-audio --disable-features=Translate --no-first-run --user-data-dir="saveCookie/' + account + '" --remote-debugging-port=' + port, { async: true, silent: true })
			// await shell.exec('"/Applications/Chromium.app/Contents/MacOS/Chromium" --mute-audio --disable-features=Translate --no-first-run --user-data-dir="saveCookie/' + account + '" --remote-debugging-port=' + port, { async: true })
			await shell.exec('google-chrome-stable --no-sandbox --disable-gpu --disable-setuid-sandbox --no-first-run --disable-features=Translate --user-data-dir="puppet/' + player + login + '" --remote-debugging-port=' + port, { async: true, silent: true })

			await wait(1000)

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
					const { Network, Page, Runtime, DOM, Input, Browser, Target } = client;
					N = Network;
					P = Page;
					R = Runtime;
					D = DOM;
					B = Browser;
					I = Input;
					T = Target;

					// setup handlers
					Network.requestWillBeSent((params) => {
						// console.log(params.request.url);
					});
					// enable events then start!
					await Network.enable();
					await Page.enable();

					const { targetInfos } = await Target.getTargets();
					targetId = targetInfos.find(t => t.type === 'page').targetId

					await loopConnect();
					// catchFct()
					closed = true
					console.log('out', account)
				} catch (err) {
					catchFct(err)
				} finally {
					if (client) {
						// await client.close();
					}
				}

				// client.close();
			}).on('error', (err) => {
				console.error('err2', err);
				catchFct(err)
			});
		}
		catch (e) {
			console.log('globalCatch', e)
			catchFct(e)
		}
	})
}