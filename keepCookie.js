const shell = require('shelljs');

const arg = process.argv[2]

if (arg) {
	console.log('keepCookie: ' + arg)
	const log = 'aaa' + arg
	if (!/@/.test(arg)) return
	shell.exec(`mkdir -p "/root/puppet/puppet/${log}/Default"`)
	shell.exec(`cp -R "/root/puppet/puppet/${arg}/Default/Local Storage" "/root/puppet/puppet/${log}/Default"`)
	shell.exec(`cp -R "/root/puppet/puppet/${arg}/Default/Session Storage" "/root/puppet/puppet/${log}/Default"`)
	shell.exec(`cp -R "/root/puppet/puppet/${arg}/Default/Sessions" "/root/puppet/puppet/${log}/Default"`)
	shell.exec(`cp -R "/root/puppet/puppet/${arg}/Default/Storage" "/root/puppet/puppet/${log}/Default"`)
	shell.exec(`rm -Rf "/root/puppet/puppet/${arg}"`)
	shell.exec(`mv "/root/puppet/puppet/${log}" "/root/puppet/puppet/${arg}"`)
	return;
}

const ls = shell.exec('ls /root/puppet/puppet', { silent: true })

ls.stdout.split('\n').forEach(login => {
	// if (/93jimd@gmail.com:93billyj/.test(folder)) {
	// const [player, login, pass] = folder.split(':')
	console.log(login)
	const log = 'aaa' + login
	if (!/@/.test(login)) return
	shell.exec(`mkdir -p "/root/puppet/puppet/${log}/Default"`)
	shell.exec(`cp -R "/root/puppet/puppet/${login}/Default/Local Storage" "/root/puppet/puppet/${log}/Default"`)
	shell.exec(`cp -R "/root/puppet/puppet/${login}/Default/Session Storage" "/root/puppet/puppet/${log}/Default"`)
	shell.exec(`cp -R "/root/puppet/puppet/${login}/Default/Sessions" "/root/puppet/puppet/${log}/Default"`)
	shell.exec(`cp -R "/root/puppet/puppet/${login}/Default/Storage" "/root/puppet/puppet/${log}/Default"`)
	shell.exec(`rm -Rf "/root/puppet/puppet/${login}"`)
	shell.exec(`mv "/root/puppet/puppet/${log}" "/root/puppet/puppet/${login}"`)
	// }
})

