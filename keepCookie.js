const shell = require('shelljs');

const ls = shell.exec('ls saveCookie', { silent: true })

ls.stdout.split('\n').forEach(login => {
	// if (/93jimd@gmail.com:93billyj/.test(folder)) {
	// const [player, login, pass] = folder.split(':')
	console.log(login)
	const log = 'aaa' + login
	if (!login) return
	shell.exec(`mkdir -p "saveCookie/${log}/Default"`)
	shell.exec(`cp -R "saveCookie/${login}/Default/Local Storage" "saveCookie/${log}/Default"`)
	shell.exec(`cp -R "saveCookie/${login}/Default/Session Storage" "saveCookie/${log}/Default"`)
	shell.exec(`cp -R "saveCookie/${login}/Default/Sessions" "saveCookie/${log}/Default"`)
	shell.exec(`cp -R "saveCookie/${login}/Default/Storage" "saveCookie/${log}/Default"`)
	shell.exec(`rm -Rf "saveCookie/${login}"`)
	shell.exec(`mv "saveCookie/${log}" "saveCookie/${login}"`)
	// }
})
