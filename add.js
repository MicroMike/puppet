const puppet = require('./puppet')

const rand = (max, min) => {
  return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const logins = [
  'pedro.gomes@yopmail.com',
  'joan.gomes@yopmail.com',
  'lola.gomes@yopmail.com',
  'juan.gomes@yopmail.com',
  'roberto.gomes@yopmail.com',
]

const loop = async (login) => {
  const page = await puppet(null, true)

  let month = rand(12, 1)
  month = month < 10 ? '0' + month : '' + month

  await page.gotoUrl('https://spotify.com/us/signup')

  await page.inst('#register-email', login)
  await page.inst('#register-confirm-email', login)
  await page.inst('#register-password', login.split('@')[0])
  await page.inst('#register-displayname', login.split('@')[0])
  await page.select('#register-dob-month', month)
  await page.inst('#register-dob-day', rand(25, 1) + '')
  await page.inst('#register-dob-year', rand(32, 1963) + '')
  await page.clk('#register-' + (rand(2) ? 'male' : 'female'))
  await page.waitFor(1000 * 60 * 60)
}

for (let login of logins) {
  loop(login)
}