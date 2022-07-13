process.setMaxListeners(Infinity)

const puppet = require('./puppet')
const { getSession, copyBack } = require('./copy')
const shell = require('shelljs');
const request = require('ajax-request');
var colors = require('colors');

const arg = process.argv[2]
const max = process.argv[3] || 1
const checkAccount = process.argv[4]

const check = /check/.test(arg)
const checkLive = /checklive/.test(arg)

const rand = (max, min) => {
	return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

try {
	const b = shell.exec('git fetch && git status', { silent: true })
	if (!b.match(/up-to-date/g)) {
		console.log('----- PULL -----'.blue)
		shell.exec('npm run rm && npm run clear', { silent: true })
		shell.exec('git pull', { silent: true })
	}
}
catch (e) { }

const clientSocket = require('socket.io-client')('http://216.158.239.199:3000', { transports: ['websocket'] });
const streamId = rand(10000) + '-' + rand(10000) + '-' + rand(10000) + '-' + rand(10000)

let account
let back
let parentId
let login
let player
let varPath = process.platform === 'darwin' ? '/Users/mike/Dev/puppet/puppet/' : '/root/puppet/puppet/'

// const copyBack = () => {
// 	try {
// 		if (login) {
// 			console.log('start save copy'.yellow, account.yellow)
// 			if (player === 'tidal') {
// 				shell.exec('node keepCookie ' + player + login, { silent: false })
// 			}
// 			shell.exec('scp -r ' + varPath + player + login + ' root@216.158.239.199:/root/puppet/', { silent: true })
// 			shell.exec('rm -rf ' + varPath + player + login, { silent: true })
// 			console.log('end save copy'.yellow, account.yellow)
// 			request('http://216.158.239.199:3000' + '/checkOk?' + account, async (error, response, body) => { })
// 		}
// 	} catch (e) {
// 		console.log(e)
// 	}
// }

const exit = async (code = '0') => {
	clientSocket && clientSocket.disconnect()

	if (code !== 6 && (code !== 8 || player !== 'tidal')) {
		console.log('account', account)
		account && request('http://216.158.239.199:3000/checkOk?' + account, (error, response, body) => {
			console.log('checkOk', account, error, response, body)
		})
		await copyBack(player, login)
		shell.exec('rm -rf ' + varPath + player + login, { silent: false })
	}

	account && request('http://216.158.239.199:3000' + '/noUseAccount?' + account, () => {
		process.exit(code)
	})

	process.exit(code)
}

process.on('SIGINT', () => {
	clientSocket && clientSocket.disconnect()
	// copyBack()
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
		clientSocket.emit('isWaiting', { parentId, streamId, max })
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

clientSocket.on('canRun', async ({ account }) => {
	!checkLive && clientSocket.emit('client', { parentId, streamId, account, max })
	// !checkLive && await getAccount()
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

clientSocket.on('mRun', async (props) => {
	if (props) { account = props.account }
	if (!account) { return console.log('no account') }

	const accountInfo = account.split(':')
	player = accountInfo[0]
	login = accountInfo[1]

	try {
		shell.exec('rm -rf ' + varPath + player + login, { silent: false })
		if (!check) {
			getSession(player, login)
		}
	} catch (e) {
		console.log(e)
	}

	let page

	const newScript = check || checkAccount || /^X/.test(arg)
	const runAccount = newScript ? require('./index') : require('./runA');
	// const runTidal = require('./index');
	if (check) {
		console.log(account);
	}
	page = !newScript && await puppet(varPath + player + login)
	const returnCode = await runAccount(clientSocket, page, parentId, streamId, check, account)
	console.log('returnCode', returnCode)
	exit(returnCode)
})
