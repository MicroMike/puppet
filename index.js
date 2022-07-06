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
		let kill = false
		let C, N, P, R, D, B, I, T;
		let proto
		let chro
		let timeout
		let code
		let pid

		const [player, login, pass] = account.split(':')
		const isTidal = player === 'tidal'
		const isSpotify = player === 'spotify'
		const isAmazon = player === 'amazon'
		const isNapster = player === 'napster'
		const isApple = player === 'apple'

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
			// S.gotoLog = '#nav-login-btn'
			// S.loginError = '.login-error'
			S.noNeedLog = '[data-testid="top-navigation-dropdown"]'
			S.email = '[data-testid="username"]'
			S.pass = '[data-testid="password"]'
			S.connectBtn = '[data-testid="login-button"]'
			S.play = '[data-testid="box"] [type="button"]'
			S.timeLine = '[data-testid="mini-player"] [data-testid="box"] span'
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

		const exit = async (e) => {
			if (e !== 'loop') {
				socket.emit('log', parentId + ' - out: ' + account + ' => ' + e)
			}
		}

		const takeScreenshot = async (e) => {
			try {
				const filename = 'screenshot/' + (e || '') + '-' + player + login + '.png'
				const { data } = await P.captureScreenshot();
				fs.writeFileSync(filename, Buffer.from(data, 'base64'));

				img = await image2base64(filename)
				socketEmit('screen', { img, log: login + ' => ' + e })
			}
			catch (e) {
				console.log('screenshot error')
			}
		}

		const catchFct = async (e) => {
			if (closed) { return }

			clearTimeout(timeout)

			closed = true

			code = 5

			code = e === 'loop' ? 1 : code
			code = e === 'freeze' ? 2 : code
			code = e === 'check' ? 3 : code
			code = e === 'del' ? 4 : code
			code = e === 'tidalError' ? 6 : code
			code = e === 'amazonError' ? 6 : code
			code = e === 'spotifyError' ? 6 : code
			code = e === 'tooLong' ? 6 : code
			code = e === 'out_error_connect' ? 6 : code
			code = e === 'out_log_error' ? 6 : code
			code = e === 'used' ? 7 : code
			code = e === 'firstPlay' ? 210 : code
			code = e === 'failedLoop' ? 210 : code
			code = e === 'failedTime' ? 210 : code
			code = e === 'logout' ? 220 : code
			code = e === 'ERROR' ? 300 : code

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
				// check && shell.exec('killall node', { silent: false })
			}

			if (e === 'tidalError') {
				socketEmit('tidalError', { account })
			}

			if (code >= 4 && code !== 7 && code !== 220) {
				socket.emit('outLog', e)
				logError(e)
				console.log(getTime() + " ERR ".red, account, e)
				// await takeScreenshot(e)
			}

			if (code === 4) {
				request('http://216.158.239.199:3000' + '/error?del/' + account, function (error, response, body) { })
			}
			else if (code === 7) {
				socketEmit('used')
			}

			exit(e, code)
		}

		try {
			timeout = setTimeout(async () => {
				await catchFct('tooLong')
			}, 3 * 60 * 1000);

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

			const loop = async (selector, res) => {
				if (closed) { return }

				try {
					const el = R && await R.evaluate({ expression: 'document.querySelector(\'' + selector + '\')' })

					if (!el.result.objectId) {
						await wait(1000)
						await loop(selector, res)
					} else {
						res(true)
					}
				} catch (error) {
					if (!closed) {
						await catchFct(error)
					} else {
						console.log('closed loop', selector)
					}
				}
			}

			const waitForSelector = (selector, time = 60) => new Promise((res, rej) => {
				if (closed) { return }

				setTimeout(() => {
					res(false)
				}, time * 1000);

				if (!closed) {
					loop(selector, res)
				}
			})

			const tidalSelect = () => new Promise(async (res, rej) => {
				if (closed) { return }

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
				if (closed) { return }

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
						await catchFct(error)
					} else {
						console.log('closed click')
					}
				}
			})

			const clickon = (selector, text, time, exitOnError = true) => new Promise(async (res, rej) => {
				try {
					const wfs = await waitForSelector(selector, time)

					if (wfs !== true) {
						res(false)
						return
					}

					await wait(3000)
					await R.evaluate({ expression: `document.querySelectorAll('${selector}').forEach(b=>{if(/${text}/i.test(b.textContent) && b.click()})` })

					res(true)
				} catch (error) {
					if (!closed && exitOnError) {
						await catchFct(error)
					} else {
						console.log('closed clickon')
					}
				}
			})

			const wait = (time) => new Promise(async (res, rej) => {
				setTimeout(async () => {
					res(true)
				}, time);
			})

			const type = (value, selector) => new Promise(async (res, rej) => {
				if (closed) { return }

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
						await catchFct(error)
					} else {
						console.log('closed type')
					}
				}
			})

			const paste = (value, selector) => new Promise(async (res, rej) => {
				try {
					await waitForSelector(selector)
					await wait(5000)

					const typeExpression = `
						const el = document.querySelector('${selector}')
						el.setAttribute('value', '${value}');
					`

					await R.evaluate({ expression: typeExpression })
					res(true)
				} catch (error) {
					if (!closed) {
						await catchFct(error)
					} else {
						console.log('closed paste')
					}
				}
			})

			const get = async (selector, getter = 'innerHTML') => {
				if (closed) { return }

				try {
					await wait(1000)

					const expression = `document.querySelector('${selector}') && document.querySelector('${selector}')['${getter}']`
					const { result } = await R.evaluate({ expression })

					return result.value
				} catch (error) {
					if (!closed) {
						await catchFct(error)
					} else {
						console.log('closed get')
					}
				}
			}

			const getTimePlayer = async () => {
				if (closed) { return }

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
						await catchFct(error)
					} else {
						console.log('closed getTimePlayer')
					}
				}
			}

			const emailCheck = async () => {
				if (closed) { return }

				try {
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
						await catchFct(error)
					} else {
						console.log('closed emailCheck')
					}
				}
			}

			const goToPage = async (url) => {
				if (closed) { return }

				try {
					if (player === 'apple') {
						await click(S.pauseBtn, 1, false)
					}

					await wait(3000)

					await P.navigate({ url: url || album() });
					await P.loadEventFired();

					await wait(5000)

					const body = await get('body', 'innerHTML')
					const corectLoad = /play on napster|mot de passe|titres|rechercher|écouter|listen now|tracks|shuffle|playing|home|robot|Accueil/i.test(body)

					if (corectLoad || check) {
						// console.log('gotoPage', url);
						if (isNapster) {
							await wait(3000)
							await click('.ant-modal-close', 1, false)
						}
						return true
					}

					await goToPage(url)
				} catch (error) {
					if (!url) {
						album()
						goToPage()
					} else if (!closed) {
						// console.log('navigate', url)
						await catchFct(error)
					} else {
						console.log('closed goToPage')
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
				if (closed) { return }

				try {
					const { result } = await R.evaluate({ expression: '/interrompue|paused because/i.test(document.body.innerHTML)' })

					const noNeedLog = await waitForSelector(S.noNeedLog, 1)

					if (!noNeedLog) { return false }

					if (isTidal && result.value) {
						await click('[data-test="notification-close"]', 1)
						// console.log('playStop', account)
						usedCount++

						if (usedCount >= 3) {
							console.log('playStop 3 times'.red, account)
							await catchFct('used')
							return
						}

						return
					}

					const result2 = await R.evaluate({ expression: '/Votre abonnement a expiré|Choisissez un abonnement/i.test(document.body.innerHTML)' })

					if (isTidal && result2.result.value) {
						await catchFct('del')
						return
					}
				} catch (error) {
					if (!closed) {
						await catchFct(error)
					} else {
						console.log('closed connectedCheck')
					}
				}
			}

			const playCheck = async () => {
				if (closed) { return }

				try {
					const stillConnected = await connectedCheck();

					if (!stillConnected) {
						await catchFct('out_error_connect')
						return
					}

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
						await click(S.play)
					}
					if (pauseCount === 5) {
						socketEmit('playerInfos', { time, freeze: true, countPlays })
					}

					if (pauseCount === 10) {
						pauseCount = 0
						console.log(player, login, 'freeze'.blue)
						await catchFct('freeze')
						return
					}

					currTime = matchTime

					if (matchTime && matchTime > 30) {
						if (!nextMusic) {
							nextMusic = true
							let nextOk = false
							countPlays++

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
						await catchFct('check')
						return
					}

					if (nextMusic && countPlays > 10) {
						countPlays = 0
						countPlaysLoop++
						await loopConnect()
						return
					}

					if (nextMusic && countPlaysLoop > 5) {
						await catchFct('logout')
						return
					}

					clearTimeout(timeout)

					await wait(3000)

					await playCheck()
				} catch (error) {
					if (!closed) {
						await catchFct(error)
					} else {
						console.log('closed playCheck')
					}
				}
			}

			const disableAlert = async () => {
				await R.evaluate({ expression: `window.alert = () => { };` })
			}

			const press = async (key) => {
				if (closed) { return }

				await wait(3000)

				await I.dispatchKeyEvent({
					type: 'keyDown',
					key: key,
					code: key,
				})

				await wait(500)

				await I.dispatchKeyEvent({
					type: 'keyUp',
					key: key,
					code: key,
				})
			}

			const pressedEnter = async () => {
				await Input.dispatchKeyEvent({ "type": "rawKeyDown", "windowsVirtualKeyCode": 13, "unmodifiedText": "\r", "text": "\r" })
				await Input.dispatchKeyEvent({ "type": "char", "windowsVirtualKeyCode": 13, "unmodifiedText": "\r", "text": "\r" })
				await Input.dispatchKeyEvent({ "type": "keyUp", "windowsVirtualKeyCode": 13, "unmodifiedText": "\r", "text": "\r" })
			}

			const loopConnect = async (first = false) => {
				if (closed) { return }

				try {
					album()
					await goToPage(currentAlbum)

					if (player === 'apple') {
						disableAlert()
					}

					const noNeedLog = !check && await waitForSelector(S.noNeedLog, 30)

					if (!noNeedLog) {
						if (isAmazon) {
							await P.navigate({ url: 'https://music.amazon.fr/forceSignIn?useHorizonte=true' });
							await P.loadEventFired();
						} else if (isNapster) {
							await P.navigate({ url: 'https://web.napster.com/auth/login' });
							await P.loadEventFired();
						} else {
							await click(S.gotoLog)
						}

						const hasEmailInput = !isApple && await waitForSelector(S.email)
						const amazonReLog = isAmazon && await waitForSelector('#ap-credential-autofill-hint', 5)

						if (isApple) {
							await wait(5000)
							await press('Tab')
							await press('Tab')

							await wait(3000)
							await I.insertText({
								text: login,
							})

							await wait(3000)
							await pressedEnter()

							await wait(3000)
							await I.insertText({
								text: pass,
							})

							await wait(3000)
							await pressedEnter()
						} else {
							if (!hasEmailInput && !amazonReLog) {
								await emailCheck()
							}

							await I.dispatchMouseEvent({
								type: 'mousePressed',
								button: 'left',
								x: 315,
								y: 390
							})

							!amazonReLog && await type(login, S.email)

							isTidal && await click(S.next)

							let error = await waitForSelector(S.loginError, 10)

							if (error) {
								if (isTidal) {
									await catchFct('del')
									return
								}
								await catchFct('out_no_logging')
								return
							}

							await type(pass, S.pass)
							// !isTidal && await paste(pass, S.pass)

							await click(S.connectBtn)

							error = await waitForSelector(S.loginError, 10)
							// const { result } = await R.evaluate({ expression: '/essayer gratuitement/i.test(document.body.innerHTML)' })

							if (error) {
								if (isTidal) {
									await catchFct('del')
									return
								}
								await catchFct('out_error_connect')
								return
							}

							first && await tidalSelect()
						}
					}

					await wait(rand(3000, 1000))

					const logSuccess = await waitForSelector(S.noNeedLog, 120)
					if (!logSuccess) {
						await wait(rand(3000, 1000))
						if (isTidal) {
							await catchFct('tidalError')
							return
						}
						await catchFct('out_log_error')
						return
					}

					if (!noNeedLog) {
						console.log(login, 'log Success'.green)
					}
					if (first && noNeedLog) {
						console.log(login, 'log Success'.green, 'noNeedLog'.yellow)
					}

					clearTimeout(timeout)

					socketEmit('playerInfos', { time: 'CONNECT', other: true })

					isSpotify && await click('#onetrust-accept-btn-handler', 5)

					if (isAmazon || isNapster) {
						await goToPage(currentAlbum)
					}

					await wait(rand(3000, 1000))

					await I.dispatchMouseEvent({
						type: 'mousePressed',
						button: 'left',
						x: 315,
						y: 390
					})

					await wait(rand(3000, 1000))
					await click(S.play)
					await wait(rand(3000, 1000))

					socketEmit('playerInfos', { time: 'PLAY', ok: true })

					await wait(rand(3000, 1000))

					try {
						first && console.log('start save copy'.yellow, account)

						// isTidal && shell.exec('node keepCookie ' + player + login, { silent: false })

						isTidal && shell.exec('rm -rf /root/puppet/puppet/' + player + login + '/Default/Cache', { silent: true })

						clearTimeout(timeout)
						shell.exec('scp -r /root/puppet/puppet/' + player + login + ' root@216.158.239.199:/root/puppet/', { async: !check, silent: true })
						check && console.log('end save copy'.yellow, account)
					} catch (e) {
						console.log('copy error'.red, e)
					}

					if (isTidal) {
						const delTidal = await get('.ReactModal__Overlay', 'innerText')
						if (/expired/.test(delTidal)) {
							await catchFct('del')
							return
						}
					}

					await playCheck()
				} catch (error) {
					if (!closed) {
						await catchFct(error)
					} else {
						console.log('closed loopConnect')
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
						'--chromePath=/bin/google-chrome-stable',
						'--no-first-run',
						'--disable-gpu',
						'--disable-setuid-sandbox',
						'--disable-features=Translate',
						'--no-sandbox',
						'--user-data-dir=/root/puppet/puppet/' + player + login,
						// '--remote-debugging-port=' + port,
					]
				});
			}

			const chrome = await launchChrome();
			chro = chrome
			pid = chrome.pid
			console.log('pid', pid)

			if (!pid) {
				console.log('chrome error', chrome)
				chrome.process.kill()
				throw 'error pid'
			}

			const options = {
				host: '127.0.0.1',
				port: chrome.port
			}

			const protocol = await CDP(options);
			proto = protocol

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

			const fct = () => {
				closed = true
				console.log('CHROME OUT'.red)
				try {
					proto.close();
				} catch (e) {
					console.log('proto error', e)
				}
			}

			try {
				chrome.process.on('close', fct)
			} catch (error) {
				console.log('catchOut 2')
			}

			console.log('Connected!'.green, login);

			// setup handlers
			// Network.requestWillBeSent((params) => {
			// console.log(params.request.url);
			// });

			await loopConnect(true);

			console.log('out'.green, account)

			await catchFct('out')
		}
		catch (e) {
			console.log('globalCatch', e)
			console.log('pid', pid)
			pid && shell.exec('kill -9 ' + pid)
			await catchFct('ERROR')
		} finally {
			try {
				chro.kill()
				proto.close();
			} catch (e) {
				console.log('finally', e)
			}

			r(code)
		}
	})
}