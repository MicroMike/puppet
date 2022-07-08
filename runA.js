module.exports = async (socket, page, parentId, streamId, check, account) => {
	return new Promise(async (r) => {
		const fs = require('fs');
		const shell = require('shelljs');
		const image2base64 = require('image-to-base64');
		const request = require('ajax-request');
		const al = require('./albums')
		var colors = require('colors');

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
		let code
		let closed = false
		let timeout

		const rand = (max, min = 0) => {
			return Math.floor(Math.random() * Math.floor(max)) + 1 + min;
		}

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
			S.timeLine = '.web-chrome-playback-lcd__playback-time'
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

		const album = () => {
			let albumUrl = albums[rand(albums.length)]
			currentAlbum = albumUrl
			return albumUrl
		}

		const save = async () => {
			try {
				console.log('start save copy'.yellow, player, login)

				shell.exec('rm -rf /root/puppet/puppet/' + player + login + '/Default/Cache', { silent: true })
				shell.exec("rm -rf /root/puppet/puppet/" + player + login + "/Default/'Session Storage'", { silent: true })

				shell.exec('scp -r /root/puppet/puppet/' + player + login + ' root@216.158.239.199:/root/puppet/', { silent: true })

				console.log('end save copy'.yellow, player, login)
			} catch (e) {
				console.log('copy error'.red, e)
			}
		}

		const checkPlay = async (first = false) => {
			const time = await page.getTime(S.timeLine, S.callback)
			const matchTime = Number(time)

			socketEmit('playerInfos', { time, ok: true, countPlays })

			if (matchTime === currTime) {
				pauseCount++
			}

			if (pauseCount > 1) {
				socketEmit('playerInfos', { time: currTime, freeze: true, warn: true, countPlays })
			}

			if (matchTime > currTime) {
				if (pauseCount > 0) { socketEmit('playerInfos', { time: currTime, ok: true, countPlays }) }
				pauseCount = 0

				if (!nextMusic) {
					nextMusic = true
					countPlays++
					socketEmit('plays', { next: false, currentAlbum, matchTime, countPlays })
				}
			}

			if (matchTime < currTime) {
				nextMusic = false
			}

			if (countPlays > 5) {
				countPlays = 0
				countPlaysLoop++
			}

			if (countPlaysLoop > 5 || pauseCount > 5) {
				pauseCount = 0
				countPlaysLoop = 0

				album()
				await page.gotoUrl(currentAlbum)

				await page.clk(S.play)

				save()
			}

			if (first) {
				save()
			}

			await page.waitFor(3000)

			currTime = matchTime

			await checkPlay()
		}

		try {
			socketEmit('playerInfos', { time: 'CONNECT', other: true })

			album()
			await page.gotoUrl(currentAlbum)

			console.log('Connected!'.green, player, login)

			const isConnected = await page.wfs(S.noNeedLog, false, 15)

			if (!isConnected) {
				throw 'out_log_error'
			}

			await page.clk(S.play)

			socketEmit('playerInfos', { time: 'PLAY', ok: true })

			await checkPlay(true)
		}
		catch (e) {
			await catchFct(e)
		} finally {
			r(code)
		}
	})
}