const shell = require('shelljs');

const arg = process.argv[2]

const start = async () => {
	for (let i = 1; i <= arg; i++) {
		await shell.exec('node index ' + (3100 + i), { async: i !== arg })
	}
}

start()