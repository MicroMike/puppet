const Nightmare = require('nightmare')

const page = Nightmare({
	electronPath: require('electron'),
	// openDevTools: {
	//   mode: 'detach'
	// },
	alwaysOnTop: false,
	waitTimeout: 1000 * 60,
	show: true,
	width: 851,
	height: 450,
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

const main = async () => {
	await page.goto('https://netflix.com')
}

main()