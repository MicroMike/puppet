const { exec } = require("child_process");

// exec('')
// exec('scp -r root@216.158.239.199:"/root/puppet/tidalnawof36088@iistoria.com/Default/Session Storage" "/root/puppet/puppet/tidalnawof36088@iistoria.com/Default/Session Storage"')
exec('scp -r root@216.158.239.199:"/root/puppet/tidalnawof36088@iistoria.com/Default/Local\\ Storage" /root/puppet/puppet/tidalnawof36088@iistoria.com/Default/Local\\ Storage', (error, stdout, stderr) => {
	if (error) {
			console.log(`error: ${error.message}`);
			return;
	}
	if (stderr) {
			console.log(`stderr: ${stderr}`);
			return;
	}
	console.log(`stdout: ${stdout}`);
});