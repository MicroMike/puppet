process.setMaxListeners(Infinity)

const shell = require('shelljs');
const request = require('ajax-request');
// const sockets = []

const arg = process.argv[2]
const nb = Number(process.argv[3]) || 1
const thread = Number(process.argv[4]) || 1

const check = arg === 'check'

let close = false
process.on('SIGINT', () => {
	close = true
	request('http://216.158.239.199:3000' + '/clearUsed', () => {
		console.log('----- END -----')
		shell.exec('killall -9 chrome', { silent: true })
		shell.exec('killall -9 node', { silent: true })
		process.exit()
	})
})

const fct = async (i = 1) => {
	if (close) { return }

	const current = arg + i

	console.log('----- START ' + current + ' ----- ')

	try {
		const b = shell.exec('git fetch && git status', { silent: true })
		if (!b.match(/up to date/g)) {
			console.log('----- PULL ' + current + ' -----')
			shell.exec('npm run rm && npm run clear', { silent: true })
			shell.exec('git reset --hard origin/master', { silent: true })
			shell.exec('git pull', { silent: true })
		}
	}
	catch (e) { }

	const ram = shell.exec('free -m |awk \'{ print $2 }\' | awk \'NR == 2\'', { silent: true }).stdout.trim()
	shell.exec((check || /^X/.test(arg) ? '' : 'xvfb-run -a') + ' node --max-old-space-size=' + ram + ' multi ' + (check ? 'check' : current) + ' ' + nb, () => {
		if (close) { return }
		fct(i)
	})
}

shell.exec('killall -9 chrome', { silent: true })
shell.exec('./update.sh', { silent: true })

try {
	shell.exec('expressvpn disconnect', { silent: true })
}
catch (e) { }

for (let i = 1; i <= thread; i++) {
	if (close) { break }
	fct(i)
}