process.setMaxListeners(Infinity)

const puppet = require('./puppet')
const shell = require('shelljs');
const request = require('ajax-request');

const arg = process.argv[2]
const max = process.argv[3] || 1
const checkAccount = process.argv[4]

const check = arg === 'check'

const rand = (max, min) => {
	return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const clientSocket = require('socket.io-client')('http://216.158.239.199:3000', { transports: ['websocket'] });
const streamId = rand(10000) + '-' + rand(10000) + '-' + rand(10000) + '-' + rand(10000)

let account
let back
let parentId
let login
let player
let varPath = process.platform === 'darwin' ? '/Users/mike/Dev/puppet/puppet/' : '/root/puppet/puppet/'

const copyBack = () => {
	try {
		if (login) {
			console.log('start save copy', account)
			if (!/amazon|apple/.test(account)) {
				shell.exec('node keepCookie ' + player + login, { silent: false })
			}
			shell.exec('scp -r ' + varPath + player + login + ' root@216.158.239.199:/root/puppet/', { silent: false })
			shell.exec('rm -rf ' + varPath + player + login, { silent: false })
			console.log('end save copy', account)
		}
	} catch (e) {
		console.log(e)
	}
}

const exit = (code = '0') => {
	clientSocket && clientSocket.disconnect()
	copyBack()
	request('http://216.158.239.199:3000' + '/noUseAccount?' + account, () => {
		process.exit(code)
	})
}

process.on('SIGINT', () => {
	clientSocket && clientSocket.disconnect()
	copyBack()
	request('http://216.158.239.199:3000' + '/noUseAccount?' + account, () => {
		process.exit()
		exit()
	})
})

clientSocket.on('activate', async (socketId) => {
	back = !!parentId
	parentId = arg

	try {
		// const b = shell.exec('git fetch && git status', { silent: true })
		// if (!b.match(/up to date/g)) {
		// 	console.log('----- PULL ' + arg + ' -----')
		// 	shell.exec('npm run rm && npm run clear', { silent: true })
		// 	shell.exec('git reset --hard origin/master', { silent: true })
		// 	shell.exec('git pull', { silent: true })
		// }
		// shell.exec('npm run buff', { silent: true })
	}
	catch (e) { }

	if (!account) {
		clientSocket.emit('canRun', { parentId, streamId, max })
	}
	else {
		clientSocket.emit('client', { parentId, streamId, account, max, back })
	}
})

const getAccount = async () => {
	if (checkAccount) {
		request('http://216.158.239.199:3000' + '/useAccount?' + checkAccount, (error, response, body) => {
			account = JSON.parse(body).account;

			if (account) {
				clientSocket.emit('client', { parentId, streamId, account, max })
			}
			else {
				exit()
			}
		})
		return;
	}

	const accountType = check ? 'checkAccount' : 'useAccount'

	request('http://216.158.239.199:3000' + '/' + accountType, (error, response, body) => {
		account = JSON.parse(body).account;

		if (account) {
			clientSocket.emit('client', { parentId, streamId, account, max })
		}
		else {
			exit()
		}
	})
}

clientSocket.on('canRun', async () => {
	await getAccount()
})

// clientSocket.on('CdisconnectU', () => {
//   exit(true)
// })

// clientSocket.on('killall', () => {
//   exit()
// })

clientSocket.on('accountAlreadyUsed', async () => {
	clientSocket.emit('canRun', { parentId, streamId, max })
})

clientSocket.on('mRun', async () => {
	if (!account) { return console.log('no account') }

	const accountInfo = account.split(':')
	player = accountInfo[0]
	login = accountInfo[1]

	if (check || player.match(/napster|apple/)) {
		shell.exec('rm -Rf save/' + player + '_' + login, { silent: true })
	}

	try {
		shell.exec('rm -rf ' + varPath + player + login, { silent: false })
		console.log('start copy', account)
		shell.exec('scp -r root@216.158.239.199:/root/puppet/' + player + login + ' ' + varPath, { silent: false })
		console.log('end copy', account)
	} catch (e) {
		console.log(e)
	}

	let page
	const isTidal = /tidal/.test(player)
	const isSpotify = /spotify/.test(account)

	// try {
	// 	if (!isTidal && !isSpotify) {
	// 		page = await puppet('save/' + player + '_' + login, player.match(/apple/))
	// 	}
	// }
	// catch (e) {
	// 	exit()
	// }

	// if (!isTidal && !isSpotify) {
	// 	const runAccount = require('./runAccount');
	// 	await runAccount(clientSocket, page, parentId, streamId, arg === 'check', account)
	// }

	const runAccount = check || checkAccount ? require('./index') : require('./runAccount');
	// const runTidal = require('./index');
	if (check) {
		console.log(account);
	}
	page = !check && !checkAccount && await puppet(varPath + player + login)
	await runAccount(clientSocket, page, parentId, streamId, arg === 'check', account)

	exit()
})
