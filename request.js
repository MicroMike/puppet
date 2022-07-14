const axios = require('axios');

module.exports = () => {
	return axios.create({
		baseURL: 'http://216.158.239.199:3000/',
		timeout: 1000,
	});
}

