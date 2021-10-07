const shell = require('shelljs');

const arg = process.argv[2]

const ls = shell.exec('ls puppet', { silent: true })

if (arg) {
	const log = 'aaa' + arg
	shell.exec(`mkdir -p "puppet/${log}/Default"`)
	shell.exec(`cp -R "puppet/${arg}/Default/Local Storage" "puppet/${log}/Default"`)
	shell.exec(`cp -R "puppet/${arg}/Default/Session Storage" "puppet/${log}/Default"`)
	shell.exec(`cp -R "puppet/${arg}/Default/Sessions" "puppet/${log}/Default"`)
	shell.exec(`cp -R "puppet/${arg}/Default/Storage" "puppet/${log}/Default"`)
	shell.exec(`rm -Rf "puppet/${arg}"`)
	shell.exec(`mv "puppet/${log}" "puppet/${arg}"`)
}
else {
	ls.stdout.split('\n').forEach(login => {
		// if (/93jimd@gmail.com:93billyj/.test(folder)) {
		// const [player, login, pass] = folder.split(':')
		console.log(login)
		const log = 'aaa' + login
		if (!/@/.test(login)) return
		shell.exec(`mkdir -p "puppet/${log}/Default"`)
		shell.exec(`cp -R "puppet/${login}/Default/Local Storage" "puppet/${log}/Default"`)
		shell.exec(`cp -R "puppet/${login}/Default/Session Storage" "puppet/${log}/Default"`)
		shell.exec(`cp -R "puppet/${login}/Default/Sessions" "puppet/${log}/Default"`)
		shell.exec(`cp -R "puppet/${login}/Default/Storage" "puppet/${log}/Default"`)
		shell.exec(`rm -Rf "puppet/${login}"`)
		shell.exec(`mv "puppet/${log}" "puppet/${login}"`)
		// }
	})
}

