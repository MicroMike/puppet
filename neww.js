process.setMaxListeners(Infinity)

const puppet = require('./puppet')
const shell = require('shelljs');
const request = require('ajax-request');

const arg = process.argv[2]
const max = process.argv[3] || 1

const check = arg === 'check'

const rand = (max, min) => {
	return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

const clientSocket = require('socket.io-client')('http://173.249.43.6:3000', { transports: ['websocket'] });
const streamId = rand(10000) + '-' + rand(10000) + '-' + rand(10000) + '-' + rand(10000)

let account
let back
let parentId

const exit = (code = '0') => {
	clientSocket && clientSocket.disconnect()
	request('http://173.249.43.6:3000' + '/noUseAccount?' + account, () => {
		process.exit(code)
	})
}

process.on('SIGINT', () => {
	clientSocket && clientSocket.disconnect()
	request('http://173.249.43.6:3000' + '/noUseAccount?' + account, () => {
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

clientSocket.on('canRun', async () => {
	const accountType = check ? 'checkAccount' : 'useAccount'
	request('http://173.249.43.6:3000' + '/' + accountType, (error, response, body) => {
		account = JSON.parse(body).account;
		if (account) {
			clientSocket.emit('client', { parentId, streamId, account, max })
		}
		else {
			exit()
		}
	})
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
	let player = accountInfo[0]
	let login = accountInfo[1]

	if (check || player.match(/napster|apple/)) {
		shell.exec('rm -Rf save/' + player + '_' + login, { silent: true })
	}

	let page
	const isTidal = /tidal/.test(player)
	const isSpotify = /spotify/.test(player)

	try {
		if (!isTidal) {
			page = await puppet('save/' + player + '_' + login, player.match(/apple/))
		}
	}
	catch (e) {
		exit()
	}

	if (!isTidal) {
		const runAccount = require('./runAccount');
		await runAccount(clientSocket, page, parentId, streamId, arg === 'check', account)
	}
	else {
		const runTidal = require('./index');
		await runTidal(clientSocket, page, parentId, streamId, arg === 'check', account)
	}

	exit()
})
