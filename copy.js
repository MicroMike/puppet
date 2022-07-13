const { exec } = require("child_process");
var colors = require('colors');

const getSession = (player, login) => new Promise((res, rej) => {
	const folder = player + login

	if (player === 'tidal') {
		exec(`mkdir -p /root/puppet/puppet/${folder}/Default`)
		exec(`scp -r root@216.158.239.199:"/root/puppet/${folder}/Default/Session\\ Storage" /root/puppet/puppet/${folder}/Default/`)
		exec(`scp -r root@216.158.239.199:"/root/puppet/${folder}/Default/Local\\ Storage" /root/puppet/puppet/${folder}/Default/`)
	}

	if (player === 'amazon' || player === 'spotify') {
		exec(`mkdir -p /root/puppet/puppet/${folder}/Default`)
		exec(`scp -r root@216.158.239.199:"/root/puppet/${folder}/Default/Session\\ Storage" /root/puppet/puppet/${folder}/Default/`)
		exec(`scp -r root@216.158.239.199:"/root/puppet/${folder}/Default/Local\\ Storage" /root/puppet/puppet/${folder}/Default/`)
		exec(`scp -r root@216.158.239.199:"/root/puppet/${folder}/Default/Login\\ Data\\ For\\ Account" /root/puppet/puppet/${folder}/Default/`)
		exec(`scp -r root@216.158.239.199:"/root/puppet/${folder}/Default/Login\\ Data" /root/puppet/puppet/${folder}/Default/`)
		exec(`scp -r root@216.158.239.199:"/root/puppet/${folder}/Default/Cookies" /root/puppet/puppet/${folder}/Default/`)
	}

	console.log('getSession'.green, player, login)

	res(true)
})

const copyBack = (player, login) => new Promise((res, rej) => {
	const folder = player + login

	if (player === 'tidal') {
		exec(`ssh root@216.158.239.199 mkdir -p /root/puppet/${folder}/Default`)
		exec(`scp -r /root/puppet/puppet/${folder}/Default/Session\\ Storage root@216.158.239.199:"/root/puppet/${folder}/Default/"`)
		exec(`scp -r /root/puppet/puppet/${folder}/Default/Local\\ Storage root@216.158.239.199:"/root/puppet/${folder}/Default/"`)
	}

	if (player === 'amazon' || player === 'spotify') {
		exec(`ssh root@216.158.239.199 mkdir -p /root/puppet/${folder}/Default`)
		exec(`scp -r /root/puppet/puppet/${folder}/Default/Session\\ Storage root@216.158.239.199:"/root/puppet/${folder}/Default/"`)
		exec(`scp -r /root/puppet/puppet/${folder}/Default/Local\\ Storage root@216.158.239.199:"/root/puppet/${folder}/Default/"`)
		exec(`scp -r /root/puppet/puppet/${folder}/Default/Login\\ Data\\ For\\ Account root@216.158.239.199:"/root/puppet/${folder}/Default/"`)
		exec(`scp -r /root/puppet/puppet/${folder}/Default/Login\\ Data root@216.158.239.199:"/root/puppet/${folder}/Default/"`)
		exec(`scp -r /root/puppet/puppet/${folder}/Default/Cookies root@216.158.239.199:"/root/puppet/${folder}/Default/"`)
	}

	console.log('copyBack'.green, player, login)

	res(true)
})

// getSession('tidal', 'nawof36088@iistoria.com')
// copyBack('amazon', 'dirn.maks@protonmail.com')

module.exports = {
	getSession,
	copyBack,
}