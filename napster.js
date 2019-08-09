const api_key = 'MDAzNTM2MTItZmE1Mi00ZjlhLTkyMzQtNGRiY2UyZTgxYjFi'
const api_secret = 'NDI1NWE5ZGEtYmE4Mi00YzQ2LWJjZTMtZDZmN2U5NzY5MmRj'

const puppet = require('./puppet')
var shell = require('shelljs');

const main = async () => {
  const user = 'selis@fastair.info'
  const pass = '20192019'
  let access_token
  let refresh_token

  shell.exec(`curl -v -X POST -u "${api_key}:${api_secret}" -d "username=${user}&password=${pass}&grant_type=password" "https://api.napster.com/oauth/token"`, { silent: true }, async (a, b, c) => {
    const response = JSON.parse(b)
    access_token = response.access_token
    refresh_token = response.refresh_token

    let page = await puppet('')
    await page.gotoUrl(`./napster.html?access_token=${access_token}&refresh_token=${refresh_token}`)

    shell.exec(`curl -v -X POST -d "client_id=${api_key}&client_secret=${api_secret}&response_type=code&grant_type=refresh_token&refresh_token=${refresh_token}" "https://api.napster.com/oauth/access_token"`, { silent: true }, (a, b, c) => {
      console.log(JSON.parse(a))
    })
  })

}

main()