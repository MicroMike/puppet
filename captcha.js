module.exports = async (page, websiteURL, websiteKey, username, login) => {
	const request = require('ajax-request');

	const invisibleTask = {
		type: 'NoCaptchaTaskProxyless',
		websiteURL,
		websiteKey,
		invisible: true
	}

	const v2task = {
		type: "RecaptchaV2TaskProxyless",
		websiteURL,
		websiteKey
	}

	const task = username
		? invisibleTask
		: v2task

	try {
		const anticaptcha = (invisible = false) => {
			return new Promise((resolve, reject) => {
				request({
					url: 'https://api.anti-captcha.com/createTask',
					method: 'POST',
					json: true,
					data: {
						clientKey: '1598b04fcee925998a78c2b75fd4dbd0',
						task
					}
				}, function (err, res, response) {
					if (!response || !response.taskId) {
						console.log(response || 'no response')
						resolve('error')
						return;
					}

					const interval = setInterval(() => {
						request({
							url: 'https://api.anti-captcha.com/getTaskResult',
							method: 'POST',
							json: true,
							data: {
								clientKey: '1598b04fcee925998a78c2b75fd4dbd0',
								taskId: response.taskId
							}
						}, function (err, res, response) {
							try {
								if (response && response.status !== 'processing') {
									clearInterval(interval)
									resolve(response.solution.gRecaptchaResponse)
								}
								else if (!response) {
									throw 'error'
								}
							}
							catch (e) {
								console.log(response || 'no response B')
								clearInterval(interval)
								resolve('error')
								return;
							}
						});
					}, 1000 * 30)
				});
			})
		}

		const resolveCaptcha = async () => {
			return new Promise(async (resolve, reject) => {
				try {
					const captcha = await anticaptcha(true)
					if (captcha === 'error') { return resolve('error') }

					resolve(captcha)
				}
				catch (e) {
					console.log(e)
					resolve('error')
				}
			})
		}

		const captcha = await resolveCaptcha()

		await page.rload()

		if (username) {
			await page.inst(username, login, true)

			await page.evaluate((captcha) => {
				setTimeout(() => {
					let clients = window.___grecaptcha_cfg.clients[0]
					Object.keys(clients).map(key => {
						let client = clients[key]
						Object.keys(client).map(k => {
							let l = client[k]
							const callback = l && l.callback
							callback && callback(captcha)
						})
					})
				}, 5000);
			}, captcha)
		} else {
			const grecaptcha_cfg = await page.evaluate((captcha) => {
				const recaptchaResponse = document.querySelector('#g-recaptcha-response')
				if (recaptchaResponse) {
					recaptchaResponse.textContent = captcha
					setTimeout(() => {
						// let a = window.___grecaptcha_cfg.clients[0].U
						// Object.values(a)[0].callback('')
					}, 5000);
					return 'ok'
				}
				return 'error'
			}, captcha)

			console.log('grecaptcha_cfg', grecaptcha_cfg)
			console.log(captcha)
		}

		// } else {
		// 	const elementHandle = await page.$('iframe');
		// 	const frame = await elementHandle.contentFrame();
		// 	await frame.waitForSelector('#g-recaptcha-response');
		// 	await frame.evaluate(() => {
		// 		document.querySelector('#g-recaptcha-response').textContent = captcha
		// 	}, captcha)
		// }


		return true
	}
	catch (e) {
		console.log(e)
		return false
	}
}
