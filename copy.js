const { exec } = require("child_process");

const getSession = (player, login) => new Promise((res, rej) => {
	const folder = player + login

	if (player === 'tidal') {
		exec(`mkdir -p /root/puppet/puppet/${folder}/Default`)
		exec(`scp -r root@216.158.239.199:"/root/puppet/${folder}/Default/Session\\ Storage" /root/puppet/puppet/${folder}/Default/`)
		exec(`scp -r root@216.158.239.199:"/root/puppet/${folder}/Default/Local\\ Storage" /root/puppet/puppet/${folder}/Default/`)
	}

	if (player === 'amazon') {
		exec(`mkdir -p /root/puppet/puppet/${folder}/Default`)
		exec(`scp -r root@216.158.239.199:"/root/puppet/${folder}/Default/Session\\ Storage" /root/puppet/puppet/${folder}/Default/`)
		exec(`scp -r root@216.158.239.199:"/root/puppet/${folder}/Default/Local\\ Storage" /root/puppet/puppet/${folder}/Default/`)
		exec(`scp -r root@216.158.239.199:"/root/puppet/${folder}/Default/Login\\ Data\\ For\\ Account" /root/puppet/puppet/${folder}/Default/`)
		exec(`scp -r root@216.158.239.199:"/root/puppet/${folder}/Default/Login\\ Data" /root/puppet/puppet/${folder}/Default/`)
		exec(`scp -r root@216.158.239.199:"/root/puppet/${folder}/Default/Cookies" /root/puppet/puppet/${folder}/Default/`)
	}

	res(true)
})

const copyBack = (player, login) => new Promise((res, rej) => {
	const folder = player + login

	if (player === 'tidal') {
		// exec(`mkdir -p /root/puppet/${folder}/Default`)
		exec(`scp -r /root/puppet/puppet/${folder}/Default/Session\\ Storage root@216.158.239.199:"/root/puppet/${folder}/Default/"`, (error, stdout, stderr) => {
			if (error) {
				console.log(`error: ${error.message}`);
				return;
			}
			if (stderr) {
				console.log(`stderr: ${stderr}`);
				return;
			}
			console.log(`stdout: ${stdout}`);
		})
		exec(`scp -r /root/puppet/puppet/${folder}/Default/Local\\ Storage root@216.158.239.199:"/root/puppet/${folder}/Default/"`)
	}

	if (player === 'amazon') {
		// exec(`mkdir -p /root/puppet/${folder}/Default`)
		exec(`scp -r /root/puppet/puppet/${folder}/Default/Session\\ Storage root@216.158.239.199:"/root/puppet/${folder}/Default/"`)
		exec(`scp -r /root/puppet/puppet/${folder}/Default/Local\\ Storage root@216.158.239.199:"/root/puppet/${folder}/Default/"`)
		exec(`scp -r /root/puppet/puppet/${folder}/Default/Login\\ Data\\ For\\ Account root@216.158.239.199:"/root/puppet/${folder}/Default/"`)
		exec(`scp -r /root/puppet/puppet/${folder}/Default/Login\\ Data root@216.158.239.199:"/root/puppet/${folder}/Default/"`)
		exec(`scp -r /root/puppet/puppet/${folder}/Default/Cookies root@216.158.239.199:"/root/puppet/${folder}/Default/"`)
	}

	res(true)
})

// getSession('tidal', 'nawof36088@iistoria.com')
copyBack('tidal', 'nawof36088@iistoria.com')

module.exports = {
	getSession,
	copyBack,
}