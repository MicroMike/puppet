module.exports = async (socket, page, parentId, streamId, check, account) => {
	return new Promise(async (r) => {
		const request = require('ajax-request');
		const shell = require('shelljs');
		const image2base64 = require('image-to-base64');
		const captcha = require('./captcha')

		const accountInfo = account.split(':')
		let player = accountInfo[0]
		let login = accountInfo[1]
		let pass = accountInfo[2]
		let countStream = 0
		let streamOn = false
		let countPlays = 0
		let mailPage

		const al = require('./albums')
		let albums = al[player]

		const socketEmit = (event, params) => {
			socket.emit(event, {
				parentId,
				streamId,
				account,
				...params,
			});
		}

		// const inter = () => {
		//   if (socket.connected) {
		//     socket.emit('ping')
		//     setTimeout(() => {
		//       inter()
		//     }, 1000 * 60);
		//   }
		// }

		// socket.on('activate', () => {
		//   socketEmit('client', { env })
		//   inter()
		// })

		socket.on('retryOk', () => {
			streamOn = false
		})

		socket.on('runScript', async scriptText => {
			await page.evaluate(scriptText)
		})

		let close = false
		let trys = 0

		const getTime = () => {
			const date = new Date
			return date.getUTCHours() + 1 + 'H' + date.getUTCMinutes()
		}

		const rand = (max, min) => {
			return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
		}

		const exit = async (e) => {
			close = true

			try { await page.cls(true) }
			catch (e) { }

			if (e !== 'loop') {
				socket.emit('log', parentId + ' - out: ' + account + ' => ' + e)
			}

			r(socket)
		}

		socket.on('forceOut', () => {
			exit('forceOut')
		})

		const takeScreenshot = async (name) => {
			let img

			try {
				await page.screenshot({ path: name + '_' + account + '.png' });
				img = await image2base64(name + '_' + account + '.png')
			}
			catch (e) { }

			socketEmit('screen', { img, log: login + ' => ' + name })
		}

		const stream = async () => {
			await takeScreenshot('stream')
			await page.waitFor(3000)

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

		let currentAlbum

		const album = () => {
			let albumUrl = albums[rand(albums.length)]
			while (currentAlbum === albumUrl) {
				albumUrl = albums[rand(albums.length)]
			}
			currentAlbum = albumUrl
			return albumUrl
		}

		const logError = (e) => {
			socket.emit('log', account + ' => ' + e)
		}

		let username
		let password
		let url
		let remember
		let loginBtn
		let playBtn
		let nextBtn
		let pauseBtn
		let replayBtn
		let shuffleBtn
		let repeatBtn
		let repeatBtnOk
		let loggedDom
		let notLoggedDom
		let goToLogin
		let keyCaptcha
		let usedDom
		let reLog
		let loginError
		let timeLine
		let style
		let callback
		let unlock1
		let unlock2
		let freezeConnect

		let usernameInput = true
		let connected = false
		let suppressed = false

		freezeConnect = !check && setTimeout(async () => {
			await takeScreenshot('freezeConnect')
			socket.emit('outLog', 'freezeConnect')
			console.log('freezeConnect')
			if (player === 'tidal') {
				catchFct('tidalError');
			} else {
				exit('freezeConnect')
			}
		}, 1000 * 60 * 10);

		socketEmit('playerInfos', { time: 'RUN', other: true })

		page && page.on('close', function (err) {
			if (!close && !check) {
				exit('close')
			}
		});

		// page.on('console', msg => {
		//   for (let i = 0; i < msg.args().length; ++i)
		//     logError(`${account} => ${i}: ${msg.args()[i]}`)
		// });

		const catchFct = async (e) => {
			close = true

			let code = 5
			let varPath = process.platform === 'darwin' ? '/Users/mike/Dev/puppet/puppet/' : '/root/puppet/puppet/'

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

			if (code !== 4 || code !== 6) {
				try {
					if (login) {
						console.log('start save copy', account)
						shell.exec('node keepCookie ' + player + login, { silent: false })
						shell.exec('scp -r ' + varPath + player + login + ' root@216.158.239.199:/root/puppet/', { silent: false })
						shell.exec('rm -rf ' + varPath + player + login, { silent: false })
						console.log('end save copy', account)
					}
				} catch (e) {
					console.log(e)
				}
			}

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

			if (player === "spotify") {
				if (code === 6) {
					// shell.exec('rm -Rf save/' + player + '_' + login, { silent: true })
					//   await page.gotoUrl('https://accounts.spotify.com/revoke_sessions', true)
				}
				// await page.gotoUrl('https://spotify.com/logout', true)
			}

			if (code === 4) {
				request('http://216.158.239.199:3000' + '/error?del/' + account, function (error, response, body) { })
			}
			else if (code === 7) {
				if (player === 'napster') {
					await takeScreenshot(e)
				}
				socketEmit('used')
			}

			exit(e)
		}

		try {
			if (player === 'napster') {
				url = 'https://app.napster.com/login/'
				loggedDom = '.icon-settings2'
				notLoggedDom = '#nav-login-btn'

				username = '#username'
				password = '#password'
				loginBtn = '.signin'
				loginError = '.login-error'

				unlock1 = '.player-btn[title="Next Song"]'
				playBtn = '.track-list-header .shuffle-button.icon-shuffle2'
				pauseBtn = '.icon-pause2'
				replayBtn = '.icon-play-button'
				// shuffleBtn = ''
				nextBtn = '.player-advance-button.icon-next2'
				// repeatBtn = '.repeat-button'
				// repeatBtnOk = '.repeat-button.repeat'

				usedDom = '.player-error-box'

				timeLine = '.player-time'
				callback = a => (a.split(' / ')[0].split(':').reduce((a, b) => a * 60 + Number(b)))
			}
			if (player === 'amazon') {
				url = 'https://music.amazon.fr/gp/dmusic/cloudplayer/forceSignIn'
				loggedDom = '.actionSection.settings'
				notLoggedDom = '#signInButton'

				username = '#ap_email'
				password = '#ap_password'
				remember = '[name="rememberMe"]'
				loginBtn = '#signInSubmit'
				loginError = '.upsellButton'

				playBtn = '#detailHeaderButton2'
				pauseBtn = '[icon-name="pause"]'
				nextBtn = '[icon-name="next"]'

				usedDom = '.concurrentStreamsPopover'

				timeLine = '#transport > :last-child > :last-child span'
				callback = a => (a.split(':').reduce((a, b) => a * 60 + Number(b)))
			}
			if (player === 'tidal') {
				url = 'https://listen.tidal.com/'
				loggedDom = '[class*="userLoggedIn"]'
				notLoggedDom = '[datatest="no-user--login"]'

				username = 'input#email'
				password = '[name="password"]'
				loginBtn = '.login-cta'
				goToLogin = '#sidebar section button + button'
				loginError = '.box-error'

				unlock1 = '[class*="playbackToggle"]'
				unlock2 = '[class*="playbackToggle"]'
				playBtn = '[data-test="header-controls"] [data-test="shuffle-all"]'
				pauseBtn = '[class*="playbackToggle"]'
				replayBtn = '[class*="playbackToggle"]'
				// repeatBtn = '[class*="leftColumn"] [class*="repeat"]:not([class*="all"])'
				// shuffleBtn = '[class*="leftColumn"] [class*="shuffleButton"]:not([class*="active"])'
				nextBtn = '[data-test="next"]'

				keyCaptcha = '6LcaN-0UAAAAAN056lYOwirUdIJ70tvy9QwNBajZ'
				keyCaptchaHuman = '6LccSjEUAAAAANCPhaM2c-WiRxCZ5CzsjR_vd8uX'

				usedDom = '.WARN'
				reLog = 'button.btn-client-primary'

				timeLine = '[data-test="current-time"]'
				callback = a => (a.split(':').reduce((a, b) => a * 60 + Number(b)))

				loggedDom = '[class*="badgeContainer"]'
				goToLogin = '[data-test="no-user--login"]'
				loginError = '.box-error'
				username = '#email'
				password = '#password'
				loginBtn = '.btn-success.btn-client-primary'
				playBtn = '[data-test="shuffle-all"]'
				timeLine = '[data-test="current-time"]'
				callback = a => (a.split(':').reduce((a, b) => a * 60 + Number(b)))
				nextBtn = '[data-test="next"]'
			}
			if (player === 'spotify') {
				url = 'https://accounts.spotify.com/login'
				loggedDom = '[data-testid="user-widget-link"]'
				notLoggedDom = '[data-testid="login-button"]'

				username = '#login-username'
				password = '#login-password'
				loginBtn = '#login-button'
				loginError = '.alert.alert-warning'

				unlock1 = '.spoticon-pause-16'
				unlock2 = '.spoticon-play-16'
				playBtn = '.main-view-container button'
				repeatBtn = '[class*="spoticon-repeat"]'
				repeatBtnOk = '.spoticon-repeat-16.control-button--active'
				shuffleBtn = '.spoticon-shuffle-16:not(.control-button--active)'
				nextBtn = '.spoticon-skip-forward-16'

				keyCaptcha = '6LeIZkQUAAAAANoHuYD1qz5bV_ANGCJ7n7OAW3mo'

				usedDom = '.ConnectBar'

				timeLine = '[data-testid="playback-position"]'
				callback = a => (a.split(':').reduce((a, b) => a * 60 + Number(b)))
			}
			if (player === 'heart') {
				url = 'https://www.iheart.com'
				notLoggedDom = '[data-test="no-user-icon-wrapper"]'
				loggedDom = '[data-test="hero-container"] [data-test="play-button"]'

				username = '#username'
				password = '#password'
				loginBtn = '[data-test="login-button"]'
				// loginError = '.alert.alert-warning'

				unlock1 = '.spoticon-pause-16'
				unlock2 = '.spoticon-play-16'
				playBtn = '[data-test="hero-container"] [data-test="play-button"]'
				// repeatBtn = '[class*="spoticon-repeat"]'
				// repeatBtnOk = '.spoticon-repeat-16.control-button--active'
				// shuffleBtn = '.spoticon-shuffle-16:not(.control-button--active)'
				nextBtn = '[data-test="skip-button"]'

				// usedDom = '.ConnectBar'

				timeLine = '[data-test="player-current-time"]'
				callback = a => (a.split(':').reduce((a, b) => a * 60 + Number(b)))
			}
			if (player === 'apple') {
				url = 'https://music.apple.com/login'
				notLoggedDom = '.web-navigation__auth-button--sign-in'
				loggedDom = '.web-navigation__auth-button--sign-out'

				username = '#account_name_text_field'
				password = '#password_text_field'
				loginBtn = '#sign-in'
				// loginError = '.alert.alert-warning'

				unlock1 = '.spoticon-pause-16'
				unlock2 = '.spoticon-play-16'
				playBtn = '.shuffle-button.action-button'
				// repeatBtn = '[class*="spoticon-repeat"]'
				// repeatBtnOk = '.spoticon-repeat-16.control-button--active'
				// shuffleBtn = '.spoticon-shuffle-16:not(.control-button--active)'
				nextBtn = '[data-test="skip-button"]'

				// usedDom = '.ConnectBar'

				timeLine = '[data-test="player-current-time"]'
				callback = a => (a.split(':').reduce((a, b) => a * 60 + Number(b)))
			}

			// ***************************************************************************************************************************************************************
			// *************************************************************************** CONNECT ***************************************************************************
			// ***************************************************************************************************************************************************************

			const napsterCheck = async () => {
				const issueAccount = await page.ext('.account-issue')
				if (issueAccount) { throw 'del' }
			}

			const resolveTidal = async () => {
				console.log('destroy')

				page = await page.cbc()
				await page.waitFor(5000 + rand(2000))

				const elementHandle = await page.$('iframe');
				const frame = await elementHandle.contentFrame();

				const captchaCheck = await frame.evaluate(() => {
					return document.body.textContent
				})

				console.log('captchaCheck', /want to make sure it/.test(captchaCheck))

				if (/want to make sure it/.test(captchaCheck)) {
					const humanUrl = await page.evaluate(() => {
						return document.querySelector('iframe').getAttribute('src')
					})

					console.log(humanUrl)
					await page.gotoUrl(humanUrl)

					await captcha(page, 'https://geo.captcha-delivery.com/captcha', keyCaptchaHuman)

					console.log('done')

					await page.waitFor(5000 + rand(2000))
					return
					resolveTidal()
				}

				return
			}

			const tidalConnect = async () => {
				await page.gotoUrl(album())

				const isLogged = await page.ext(loggedDom)
				const isGoToLogin = await page.ext(goToLogin)

				if (!isLogged && isGoToLogin) {
					if (!check) {
						throw 'tidalError';
					}

					// await page.clk(goToLogin)

					const hasEmailInput = async () => {
						try {
							await page.waitFor(2000 + rand(2000))
							console.log('waitForInput')
							await page.wfs(username, true, 10)
						} catch (e) {
							await hasEmailInput()
						}
					}

					await hasEmailInput()

					console.log('input OK')

					await page.inst(username, login, true)
					await page.clk('#recap-invisible')
					await page.inst(password, pass, true)

					await page.clk(loginBtn)

					const error = await page.ext(loginError)
					// const { result } = await R.evaluate({ expression: '/essayer gratuitement/i.test(document.body.innerHTML)' })

					if (error) {
						throw 'del'
					}

					await page.gotoUrl(album())
				}
			}

			const checkFill = async () => {
				// if (player === 'amazon') {
				// 	await page.jClk('a.cvf-widget-btn-verify-account-switcher')
				// 	usernameInput = await page.ext(username)
				// }

				if (usernameInput) {
					await page.inst(username, login, true)
				}

				await page.inst(password, pass, true)

				let loginFill = player === 'amazon' || await page.get(username, 'value')
				let passFill = await page.get(password, 'value')

				if (!loginFill || !passFill) {
					await takeScreenshot('fillForm')
					await checkFill()
				}
				else {
					socketEmit('retryOk')
				}
			}

			const spotCheck = async () => {
				await page.waitFor(2000 + rand(2000))
				const noLogged = await page.ext(username)

				if (noLogged) {
					throw 'del'
				}
			}

			const amazonCheck = async () => {
				const needContinue = await page.jClk('#continue')
				await page.waitFor(1000 * 3 + rand(2000))
				const lookForCode = await page.ext('input[name="code"]')

				if (needContinue && lookForCode) {
					mailPage = await page.np()

					await mailPage.gotoUrl('https://webmail.gandi.net/roundcube/')
					const needLog = await mailPage.ext('#rcmloginsubmit')

					if (needLog) {
						await mailPage.inst('#rcmloginuser', 'micromike@musicsmix.club', true)
						await mailPage.inst('#rcmloginpwd', '055625f7430', true)
						await mailPage.clk('#rcmloginsubmit')
					}

					let code
					const waitForCode = async () => {
						await mailPage.waitFor(1000 * 10 + rand(2000))
						await mailPage.bringToFront()

						await mailPage.inst('#quicksearchbox', login.split('@')[0], true)
						const getChecked = await mailPage.get('#s_mod_to', 'checked')
						if (!getChecked) { await mailPage.clk('#s_mod_to') }
						await mailPage.clk('#s_scope_all')
						await mailPage.select('#messagessearchfilter', 'UNSEEN')

						const isMail = await mailPage.jClk('#messagelist tbody tr a')

						if (isMail) {
							code = await mailPage.get('.otp', 'innerText')
							console.log('code ' + code)

							if (code && code !== 'undefined') {
								await mailPage.clk('.button.delete')
								return code
							}
						}

						catchFct('amazonError')
					}

					await waitForCode()

					await page.inst('input[name="code"]', code)
					await page.clk('input[type="submit"]')

					await page.jClk('#ap-account-fixup-phone-skip-link')
				}

				await page.bringToFront()

				const del = loginError && await page.ext(loginError)
				if (del) { throw 'del' }
			}

			const tidalCheck = async () => {
				await page.evaluate(() => {
					const rand = (max, min) => {
						return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
					}
					const artist = document.querySelectorAll('[class*="artistContainer"]')

					artist[rand(artist.length)].click()
					artist[rand(artist.length)].click()
					artist[rand(artist.length)].click()

					document.querySelector('[class*="continueButtonContainer"] button').click()
				})
			}

			const connectFct = async () => {
				if (player === 'tidal') {
					await tidalConnect()
				}

				if (player === 'amazon') {
					await page.gotoUrl(album())
					connected = await page.ext(loggedDom)
					check && console.log('amazon: ' + connected)
				}

				if (player === 'heart') {
					if (check) {
						shell.exec('expressvpn disconnect', { silent: true })
						shell.exec('expressvpn connect us')
						await page.waitFor(2000 + rand(2000))
					}

					await page.gotoUrl(album())
					await page.waitFor(2000 + rand(2000))
					const notConnected = await page.wfs(notLoggedDom)
					if (!notConnected) { connected = true }
				}

				if (player === 'apple') {
					await page.gotoUrl(url)
					await page.waitFor(2000 + rand(2000))

					const appleNotConnected = await page.ext(notLoggedDom)

					if (appleNotConnected) {
						await page.clk(notLoggedDom)
						await page.waitFor(5000 + rand(2000))
						await page.keyboard.press("Tab");
						await page.waitFor(2000 + rand(2000))
						await page.keyboard.press("Tab");
						await page.waitFor(2000 + rand(2000))
						await page.keyboard.press("Tab");

						login.split('').forEach(async (lettre) => {
							await page.keyboard.press(lettre);
						})

						await page.waitFor(2000 + rand(2000))
						await page.keyboard.press("Enter");

						await page.waitFor(5000 + rand(2000))
						pass.split('').forEach(async (lettre) => {
							await page.keyboard.press(lettre);
						})

						await page.waitFor(2000 + rand(2000))
						await page.keyboard.press("Enter");

						await page.waitFor(2000 + rand(2000))
					}
					await page.gotoUrl(album())

					return;
				}

				if (player === 'spotify' || player === 'napster' || player === 'amazon') {
					let notConnected = true

					await page.gotoUrl(album())
					notConnected = await page.ext(notLoggedDom)

					if (notConnected) {
						if (player === 'amazon') {
							await page.evaluate(() => {
								window.location.href = document.querySelector('#signInButton').href
							})
						} else {
							await page.gotoUrl(url)
						}

						await checkFill()

						await page.jClk(remember)
						await page.clk(loginBtn)

						await page.waitFor(2000 + rand(2000))

						if (player === 'napster' || player === 'spotify') {
							const errorMessage = await page.evaluate(() => {
								return /went wrong/.test(document.body.textContent)
							})

							if (errorMessage) {
								throw 'spotifyError'
							}

							const error = loginError && await page.ext(loginError)
							if (error) { throw 'del' }

							// await page.gotoUrl(album())
						}

						// if (player === 'amazon') {
						// 	const captchaAmazon = async () => {
						// 		try {
						// 			await page.jInst(password, pass)
						// 			const ca = await page.ext('#auth-captcha-image')
						// 			if (ca) { throw 'fail' }
						// 		}
						// 		catch (e) {
						// 			await captchaAmazon()
						// 		}
						// 	}

						// 	await captchaAmazon()

						// 	await page.jClk('#ap-account-fixup-phone-skip-link')
						// }

						await page.waitFor(5000 + rand(2000))
						await page.gotoUrl(album())
					}
				}

				socketEmit('playerInfos', { time: 'CONNECT', other: true })

				if (player === 'amazon') {
					// await amazonCheck()
					const play = await page.ext(playBtn)
					!play && await page.gotoUrl(album())
				}
				else if (player === 'tidal') {
					// creation compte tidal plus besoin pour le moment

					const artistCheck = await page.wfs('[class*="artistContainer"]')
					if (artistCheck) {
						await tidalCheck()
						await page.waitFor(5 * 1000 + rand(2000))
						await page.gotoUrl(album())
					}
				}
			}

			const waitForLogged = async (dom) => {
				try {
					await page.wfs(dom, true)
				} catch (e) {
					waitForLogged(dom)
				}
			}

			if (!check) {
				await connectFct()
			}

			if (check) {
				await page.gotoUrl(album())
				await waitForLogged(loggedDom)
			}

			clearTimeout(freezeConnect)

			// ***************************************************************************************************************************************************************
			// *************************************************************************** PLAY ******************************************************************************
			// ***************************************************************************************************************************************************************

			if (player === 'spotify') {
				await page.waitFor(2000 + rand(2000))
				const check1 = await page.ext(usedDom)
				const check2 = await page.ext('.Root__now-playing-bar .control-button.spoticon-pause-16.control-button--circled')
				if (check1 && check2) { throw 'used' }
			}

			const waitForPlayBtn = async (playError) => {
				try {
					await page.clk(playBtn)
					socketEmit('retryOk')
				}
				catch (e) {
					if (++trys > 3) {
						throw playError
					}

					// if (player === 'tidal') {
					// 	let updateBtn
					// 	try {
					// 		await page.evaluate(() => {
					// 			const update = document.querySelector('.client-eula-font + .btn-client-primary')
					// 			update && update.click()
					// 		})

					// 		updateBtn = await page.evaluate(() => {
					// 			const update = document.querySelectorAll('button')
					// 			update && update.forEach(b => b.innerText === 'Update' && b.click())
					// 			return update
					// 		})
					// 	}
					// 	catch (e) { }

					// 	if (!updateBtn) {
					// 		await page.rload()
					// 		await waitForPlayBtn(playError)
					// 	}
					// }
					// else if (player === 'amazon') {
					// 	const waitForReady = async () => {
					// 		const amazonStyle = await page.evaluate(() => {
					// 			return document.querySelector('#mainContentLoadingSpinner').style['display']
					// 		})

					// 		if (amazonStyle !== 'none') {
					// 			await takeScreenshot('amazonFreeze')
					// 			await page.waitFor(2000 + rand(2000))
					// 			await waitForReady()
					// 		}
					// 	}

					// 	await waitForReady()

					// 	try { await page.clk(playBtn) }
					// 	catch (e) {
					// 		await page.rload()
					// 		await waitForPlayBtn(playError)
					// 	}
					// }
					// else {
					// 	await page.gotoUrl(album())

					// 	const logged = await page.wfs(loggedDom)
					// 	if (!logged) { throw 'logout' }

					// 	await waitForPlayBtn(playError)
					// }
				}
			}

			await waitForPlayBtn('firstPlay')
			// await page.clk(playBtn, 'firstPlay')
			socketEmit('playerInfos', { time: 'PLAY', ok: true })

			if (player === 'tidal') {
				const delTidal = await page.get('.ReactModal__Overlay', 'innerText')
				if (String(delTidal).match(/expired|free/)) {
					throw 'del'
				}
			}

			request('http://216.158.239.199:3000' + '/checkOk?' + account, async (error, response, body) => { })

			if (check) {
				await page.cls(true)
				catchFct('check')
				return
			}

			// ***************************************************************************************************************************************************************
			// *************************************************************************** LOOP ******************************************************************************
			// ***************************************************************************************************************************************************************

			let t1
			let t2
			let freeze = 0
			let used
			let nextMusic = false
			let startLoop = false
			let exitLoop = false

			let changePlay = rand(player === 'amazon' ? 10 : 15)
			let changeLoop = 0

			const loop = async () => {
				try {
					// repeatBtn && await page.jClk(repeatBtn)
					// shuffleBtn && await page.jClk(shuffleBtn)

					used = await page.ext(usedDom)

					if (player === 'tidal') {
						const delTidal = await page.get('.ReactModal__Overlay', 'innerText')
						if (String(delTidal).match(/expired/)) {
							throw 'del'
						}
					}

					if (player === 'napster') { await napsterCheck() }

					if (player === 'tidal') {
						const usedTidal = await page.get('body', 'innerText')
						used = /interrompue|paused because/.test(usedTidal)

						await page.evaluate(() => {
							document.querySelectorAll('[data-test="notification-close"]').forEach(e => e.click())
						})

						let repeat = await page.ext('[data-type="button__repeatAll"]')
						if (!repeat) {
							await page.jClk('[data-test="repeat"]')
						}
					}

					if (player === 'amazon') {
						await page.evaluate(() => {
							document.querySelectorAll('#dialogCloseButton > *').forEach(e => e.click())
						})
					}

					if (player === 'spotify') {
						await page.evaluate(() => {
							document.querySelectorAll('#onetrust-accept-btn-handler').forEach(e => e.click())
						})
					}

					if (used) {
						throw 'used'
					}

					t2 = t1

					let matchTime = Number(t1)

					if (matchTime && matchTime > 30) {
						if (!nextMusic) {
							nextMusic = true
							let nextOk = false
							countPlays++

							const clickNext = rand(2) &&
								(currentAlbum === 'https://listen.tidal.com/album/88716570')
								|| (currentAlbum === 'https://music.amazon.fr/albums/B07CZDXC9B')

							if (clickNext) {
								nextOk = true
								await page.jClk(nextBtn)
							}

							socketEmit('plays', { next: nextOk, currentAlbum, matchTime, countPlays })
							socketEmit('playerInfos', { time: t1, ok: true, countPlays })
						}
					}
					else {
						nextMusic = false
					}

					if (countPlays > changePlay) {
						await page.gotoUrl(album())
						await waitForPlayBtn('changePlay')

						countPlays === 0
						changePlay = rand(player === 'amazon' ? 10 : 15)
						changeLoop++
					}

					if (changeLoop > 8) {
						exitLoop = true
					}

					await page.waitFor(rand(2000))
					if (player === 'apple') {
						t1 = await page.getAppleTime()
					}
					else {
						t1 = await page.getTime(timeLine, callback)
					}

					if (t1 === t2) {
						++freeze
						socketEmit('playerInfos', { time: t1, freeze: true, warn: true, countPlays })

						if (freeze === 1) {
							// startStream()
							if (player === 'tidal') {
								await page.jClk(playBtn)
							} else if (player === 'amazon') {
								await page.gotoUrl(album())
								await page.jClk(playBtn)
							}
							else {
								await page.jClk(pauseBtn)
								await page.waitFor(rand(2000))
								await page.jClk(replayBtn)
							}
						}
					}
					else {
						// streamOn = false
						if (freeze > 0) { socketEmit('playerInfos', { time: t1, ok: true, countPlays }) }
						freeze = 0
					}

					if (freeze > 0) {
						if (freeze > 3) {
							// await takeScreenshot(parentId + 'freeze' + countPlays)
							throw 'freeze'
						}
						else {
							socketEmit('playerInfos', { time: t1, freeze: true, countPlays })
						}

						const logged = await page.wfs(loggedDom)
						if (!logged) { throw 'logout' }
					}

					if (exitLoop) { throw 'loop' }
					else { loop() }
				}
				catch (e) {
					catchFct(e)
				}
			}

			loop()
		}
		catch (e) {
			catchFct(e)
		}
	})
}
