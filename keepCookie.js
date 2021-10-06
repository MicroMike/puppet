const shell = require('shelljs');

const ls = shell.exec('ls puppet', { silent: true })

ls.stdout.split('\n').forEach(login => {
	// if (/93jimd@gmail.com:93billyj/.test(folder)) {
	// const [player, login, pass] = folder.split(':')
	console.log(login)
	const log = 'aaa' + login
	if (!login) return
	shell.exec(`mkdir -p "puppet/${log}/Default"`)
	shell.exec(`cp -R "puppet/${login}/Default/Local Storage" "puppet/${log}/Default"`)
	shell.exec(`cp -R "puppet/${login}/Default/Session Storage" "puppet/${log}/Default"`)
	shell.exec(`cp -R "puppet/${login}/Default/Sessions" "puppet/${log}/Default"`)
	shell.exec(`cp -R "puppet/${login}/Default/Storage" "puppet/${log}/Default"`)
	shell.exec(`rm -Rf "puppet/${login}"`)
	shell.exec(`mv "puppet/${log}" "puppet/${login}"`)
	// }
})
