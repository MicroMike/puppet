const Nightmare = require('nightmare')
const nightmare = Nightmare({
  electronPath: require('electron'),
  // openDevTools: {
  //   mode: 'detach'
  // },
  alwaysOnTop: false,
  waitTimeout: 1000 * 60 * 3,
  show: true,
  width: 600,
  height: 600,
  typeInterval: 300,
  webPreferences: {
    webSecurity: false,
    allowRunningInsecureContent: true,
    plugins: true,
    experimentalFeatures: true
  }
})

nightmare.goto('https://spotify.com')