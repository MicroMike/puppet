process.setMaxListeners(Infinity)

const shell = require('shelljs');
const request = require('ajax-request');
// const sockets = []

const arg = process.argv[2]
const nb = Number(process.argv[3]) || 1
const checkAccount = process.argv[4]

let close = false

const exit = () => {
	close = true
	shell.exec('killall chrome', { silent: true })
	// shell.exec('killall -9 chrome', { silent: true })
	// shell.exec('taskkill /F /IM chrome.exe', { silent: true })
	console.log('----- END ' + arg + ' -----')
	process.exit()
}

process.on('SIGINT', () => {
	exit()
})

shell.exec('rm -rf /root/puppet/puppet/*', { silent: false })
shell.exec('rm -rf /tmp/lighthouse*', { silent: false })

const fct = async (i = 1) => {
	if (close) { return }

	const cmd = checkAccount ? 'node neww ' + arg + ' ' + nb + ' ' + checkAccount : 'node neww ' + arg + ' ' + nb
	// const ram = shell.exec('free -m |awk \'{ print $2 }\' | awk \'NR == 2\'', { silent: true }).stdout.trim()
	shell.exec(cmd, (a, b, c) => {
		try {
			const b = shell.exec('git fetch && git status', { silent: true })
			if (!b.match(/up-to-date/g)) {
				console.log('----- PULL ' + arg + ' -----')
				shell.exec('npm run rm && npm run clear', { silent: true })
				shell.exec('git reset --hard origin/master', { silent: true })
				shell.exec('git pull', { silent: true })
			}
		}
		catch (e) { }

		if (b === '1') { exit() }

		if (close) { return }
		fct(i)
	})
}

for (let i = 1; i <= nb; i++) {
	if (close) { break }
	fct(i)
}