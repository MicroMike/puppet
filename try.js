const Nightmare = require('nightmare')
const nightmare = Nightmare({
  electronPath: require('electron'),
  // openDevTools: {
  //   mode: 'detach'
  // },
  waitTimeout: 1000 * 60,
  show: true,
  typeInterval: 300,
  webPreferences: {
    // partition: persist,
    webSecurity: false,
    allowRunningInsecureContent: true,
    plugins: true,
    images: false,
    experimentalFeatures: true
  }
})

nightmare
  .goto('https://spotify.com')
  .catch(error => {
    console.error('Search failed:', error)
  })