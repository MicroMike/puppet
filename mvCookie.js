const shell = require('shelljs');

const arg = process.argv[2]

const ls = shell.exec('ls /root/puppet', { silent: true })

ls.stdout.split('\n').forEach(login => {
	// if (/93jimd@gmail.com:93billyj/.test(folder)) {
	// const [player, login, pass] = folder.split(':')
	console.log(login)
	const log = 'tidal' + login
	if (!/@/.test(login)) return
	shell.exec(`mkdir -p "/root/puppet/${log}/Default"`)
	shell.exec(`cp -R "/root/puppet/${login}/Default/Local Storage" "/root/puppet/${log}/Default"`)
	shell.exec(`cp -R "/root/puppet/${login}/Default/Session Storage" "/root/puppet/${log}/Default"`)
	shell.exec(`cp -R "/root/puppet/${login}/Default/Sessions" "/root/puppet/${log}/Default"`)
	shell.exec(`cp -R "/root/puppet/${login}/Default/Storage" "/root/puppet/${log}/Default"`)
	shell.exec(`rm -Rf "/root/puppet/${login}"`)
	// shell.exec(`mv "/root/puppet/${log}" "/root/puppet/${login}"`)
	// }
})

