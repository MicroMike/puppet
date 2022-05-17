const shell = require('shelljs');
var colors = require('colors');

const arg = process.argv[2]

let varPath = process.platform === 'darwin' ? '/Users/mike/Dev/puppet/puppet/' : '/root/puppet/puppet/'

if (arg) {
	console.log('keepCookie: ' + arg.yellow)
	const log = varPath + 'aaa' + arg
	if (!/@/.test(arg)) return
	shell.exec(`mkdir -p "${log}/Default"`)
	shell.exec(`cp -R "${varPath + arg}/Default/Local Storage" "${log}/Default"`)
	shell.exec(`cp -R "${varPath + arg}/Default/Session Storage" "${log}/Default"`)
	shell.exec(`cp -R "${varPath + arg}/Default/Sessions" "${log}/Default"`)
	shell.exec(`cp -R "${varPath + arg}/Default/Storage" "${log}/Default"`)

	// if (/apple/.test(arg)) {
	shell.exec(`cp -R "${varPath + arg}/Default/Cookies" "${log}/Default"`)
	shell.exec(`cp -R "${varPath + arg}/Default/Cookies-journal" "${log}/Default"`)
	// }
	shell.exec(`rm -Rf "${varPath + arg}"`)
	shell.exec(`mv "${log}" "${varPath + arg}"`)
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

