module.exports = async (socket, page, parentId, streamId, check, account) => {
	return new Promise(async (r) => {
		const CDP = require('chrome-remote-interface');
		const fs = require('fs');
		const shell = require('shelljs');
		const image2base64 = require('image-to-base64');
		const request = require('ajax-request');
		const al = require('./albums')
		const chromeLauncher = require('chrome-launcher');
		var colors = require('colors');

		let closed = false
		let C, N, P, R, D, B, I, T;
		let targetId = false;
		let timeout

		const [player, login, pass] = account.split(':')
		const isTidal = player === 'tidal'
		const isSpotify = player === 'spotify'
		const isAmazon = player === 'amazon'

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
			next: '.btn-client-primary',
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

		if (player === 'apple') {
			S.noNeedLog = '.web-navigation__auth-button--sign-out'
			S.gotoLog = '.web-navigation__auth-button--sign-in'
			S.loginError = '.alert.alert-warning'
			S.email = '#account_name_text_field'
			S.pass = '#password_text_field'
			S.connectBtn = '#sign-in'
			S.play = '.shuffle-button'
			S.pauseBtn = '.web-chrome-playback-controls__playback-btn[aria-label="Pause"]'
			S.timeLine = '[data-test="player-current-time"]'
		}

		if (player === 'amazon') {
			S.noNeedLog = '#accountSetting'
			S.gotoLog = '#signInButton'
			S.loginError = '.upsellButton'
			S.email = '#ap_email'
			S.pass = '#ap_password'
			S.connectBtn = '#signInSubmit'
			S.play = '#detailHeaderButton2'
			S.timeLine = '#transport > :last-child > :last-child span'

			// remember = '[name="rememberMe"]'
			// usedDom = '.concurrentStreamsPopover'
		}

		if (player === 'napster') {
			// url = 'https://app.napster.com/login/'
			S.noNeedLog = '.icon-settings2'
			S.gotoLog = '#nav-login-btn'
			S.loginError = '.login-error'
			S.email = '#username'
			S.pass = '#password'
			S.connectBtn = '.signin'
			S.play = '.track-list-header .shuffle-button.icon-shuffle2'
			S.timeLine = '.player-time'
			S.callback = a => (a.split(' / ')[0].split(':').reduce((a, b) => a * 60 + Number(b)))
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
			if (closed) { return }

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
			code = e === 'tooLong' ? 8 : code
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
				check && shell.exec('killall node', { silent: false })
			}

			if (e === 'tidalError') {
				socketEmit('tidalError', { account })
			}

			if (code >= 4 && code !== 7 && code !== 220) {
				socket.emit('outLog', e)
				logError(e)
				console.log(getTime() + " ERR ".red, account, e)
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
			isTidal && check && shell.exec('killall node & killall chrome', { silent: false })
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

			const port = rand(1000, 9000)
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
					if (closed) { return }

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

				if (!closed) {
					loop()
				}

				setTimeout(() => {
					res(false)
				}, time * 1000);
			})

			const tidalSelect = () => new Promise(async (res, rej) => {
				const expression = `
					const rand = (max, min = 0) => {
						return Math.floor(Math.random() * Math.floor(max) + min);
					}

					const artist = document.querySelectorAll('[class*="artistContainer"]')

					if(artist?.length > 0) {
						setTimeout(() => {
							artist[rand(artist.length)].click()
						}, 1000 * 1);
						setTimeout(() => {
							artist[rand(artist.length)].click()
						}, 1000 * 2);
						setTimeout(() => {
							artist[rand(artist.length)].click()
						}, 1000 * 3);

						setTimeout(() => {
							document.querySelector('[class*="continueButtonContainer"] button').click()
						}, 1000 * 4);
					}
					`
				R && await R.evaluate({ expression })
				res(true)
			})

			const click = (selector, time, exitOnError = true) => new Promise(async (res, rej) => {
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
					if (!closed && exitOnError) {
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
					if (player === 'apple') {
						const getTimeExpression =
							`document.querySelector('.web-chrome-playback-lcd__scrub').getAttribute('aria-valuetext').split(' ').filter(v => !isNaN(v)).join('/')`

						const { result } = await R.evaluate({ expression: getTimeExpression })
						let times = result.value.split('/')

						if (times.length > 1) {
							time = Number(times[0]) * 60 + Number(times[1])
						}
						else {
							time = Number(times[0])
						}

						return
					}
					let { result } = await R.evaluate({ expression: `document.querySelector('${S.timeLine}') && document.querySelector('${S.timeLine}').innerText` })
					time = result.value && S.callback(result.value)
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
					if (player === 'apple') {
						await click(S.pauseBtn, 1, false)
					}

					await wait(3000)

					await P.navigate({ url: url || album() });
					await P.loadEventFired();

					await wait(5000)

					const body = await get('body', 'innerHTML')
					const corectLoad = /mot de passe|titres|rechercher|écouter|listen now|tracks|shuffle|playing|home|robot|Accueil/i.test(body)

					if (corectLoad || check) {
						// console.log('gotoPage', url);
						return true
					}

					await goToPage(url)
				} catch (error) {
					if (!url) {
						album()
						goToPage()
					} else if (!closed) {
						// console.log('navigate', url)
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
							console.log('playStop 3 times'.red, account)
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
				if (closed) { return catchFct('out') }

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
						console.log(login, 'freeze'.blue)
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

					// request('http://216.158.239.199:3000' + '/checkOk?' + account, async (error, response, body) => { })

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

			const disableAlert = async () => {
				await R.evaluate({ expression: `window.alert = () => { };` })
			}

			const loopConnect = async () => {
				try {
					album()
					await goToPage(currentAlbum)

					if (player === 'apple') {
						disableAlert()
					}

					const noNeedLog = await waitForSelector(S.noNeedLog, check ? 1 : 10)

					if (!noNeedLog) {
						// if (!check) {
						// 	throw 'tidalError';
						// }
						// else {
						if (isAmazon) {
							await P.navigate({ url: 'https://music.amazon.fr/forceSignIn?useHorizonte=true' });
							await P.loadEventFired();
						} else {
							await click(S.gotoLog)
						}

						const hasEmailInput = await waitForSelector(S.email)

						if (!hasEmailInput) {
							await emailCheck()
						}

						clearTimeout(timeout)

						await type(login, S.email)

						isTidal && await click(S.next)

						let error = await waitForSelector(S.loginError, 10)

						if (error) {
							if (isTidal) {
								throw 'del'
							}
							throw 'out_no_logging'
						}

						await type(pass, S.pass)

						await click(S.connectBtn)

						error = await waitForSelector(S.loginError, 10)
						// const { result } = await R.evaluate({ expression: '/essayer gratuitement/i.test(document.body.innerHTML)' })

						if (error) {
							if (isTidal) {
								throw 'del'
							}
							throw 'out_error_connect'
						}

						await tidalSelect()
						// }
					}

					await wait(rand(3000, 1000))

					const logSuccess = await waitForSelector(S.noNeedLog, 30)
					if (!logSuccess) {
						await wait(rand(3000, 1000))
						if (isTidal) {
							throw 'tidalError'
						}
						throw 'out_log_error'
					}
					else if (!noNeedLog) {
						console.log(login, 'log Success'.green)
					}

					socketEmit('playerInfos', { time: 'CONNECT', other: true })

					isSpotify && await click('#onetrust-accept-btn-handler', 5)
					isAmazon && await goToPage(currentAlbum)

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
			// await shell.exec('google-chrome-stable --no-sandbox --disable-gpu --disable-setuid-sandbox --no-first-run --disable-features=Translate --user-data-dir="puppet/' + player + login + '" --remote-debugging-port=' + port, { async: true, silent: true })
			const launchChrome = async () => {
				return await chromeLauncher.launch({
					chromeFlags: [
						'--chromePath="/bin/google-chrome-stable"',
						'--no-first-run',
						'--disable-gpu',
						'--disable-setuid-sandbox',
						'--disable-features=Translate',
						'--no-sandbox',
						'--user-data-dir="puppet/' + player + login + '"',
						// '--remote-debugging-port=' + port,
					]
				});
			}

			const chrome = await launchChrome();

			chrome.process.on('close', () => {
				catchFct('out')
			})

			const options = {
				host: '127.0.0.1',
				port: chrome.port
			}

			const protocol = await CDP(options);

			const { Network, Page, Runtime, DOM, Input, Browser, Target } = protocol;
			// extract domains
			N = Network;
			P = Page;
			R = Runtime;
			D = DOM;
			B = Browser;
			I = Input;
			T = Target;

			await Promise.all([
				Page.enable(),
				Network.enable(),
				Runtime.enable(),
				DOM.enable(),
			]);

			// await wait(3000)
			// await connect()
			// await wait(3000)

			// await CDP(options, async (client) => {
			console.log('Connected!'.green);

			try {
				// connect to endpoint
				// console.log(client)
				// client = await CDP(options);
				// C = client

				// setup handlers
				Network.requestWillBeSent((params) => {
					// console.log(params.request.url);
				});
				// enable events then start!
				await Network.enable();
				// await Page.enable();

				const { targetInfos } = await Target.getTargets();
				targetId = targetInfos.find(t => t.type === 'page').targetId

				await loopConnect();

				console.log('out', account)

				try {
					protocol.close();
					chrome.kill();
				} catch (error) { }

				catchFct('out')
				closed = true

			} catch (err) {
				catchFct(err)
			}
		}
		catch (e) {
			try {
				protocol.close();
				chrome.kill();
			} catch (error) { }

			console.log('globalCatch', e)
			catchFct(e)
		}
	})
}