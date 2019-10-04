const request = require('ajax-request');

request.post({
  url: 'https://api.bunq.com/v1/installation',
  data: {
    'client_public_key': '8552041dbca212e4f532b2ffd5eb5a2cc6d99f681aa385d467e0034140f984be'
  }
}, function (error, response, body) {
  console.log(error, response, body)
})
