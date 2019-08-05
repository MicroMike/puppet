module.exports = async (page, websiteURL, websiteKey, username, login) => {
  const request = require('ajax-request');
  try {
    const anticaptcha = (invisible = false) => {
      return new Promise((resolve, reject) => {
        request({
          url: 'https://api.anti-captcha.com/createTask',
          method: 'POST',
          json: true,
          data: {
            clientKey: '1598b04fcee925998a78c2b75fd4dbd0',
            task: {
              type: 'NoCaptchaTaskProxyless',
              websiteURL,
              websiteKey,
              invisible
            }
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
              l && l.callback && l.callback(captcha)
            })
          })
        }, 5000);
      }, captcha)
    }
    else {
      await page.evaluate((captcha) => {
        const captchaselector = document.querySelector('#g-recaptcha-response')
        captchaselector.value = captcha
        document.querySelector('form').submit()
      }, captcha)
    }

    return true
  }
  catch (e) {
    console.log(e)
    return false
  }
}
