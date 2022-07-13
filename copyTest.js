const { exec } = require("child_process");

exec('mkdir -p /root/puppet/puppet/tidalnawof36088@iistoria.com/Default')
exec('scp -r root@216.158.239.199:"/root/puppet/tidalnawof36088@iistoria.com/Default/Session\\ Storage" /root/puppet/puppet/tidalnawof36088@iistoria.com/Default/')
exec('scp -r root@216.158.239.199:"/root/puppet/tidalnawof36088@iistoria.com/Default/Local\\ Storage" /root/puppet/puppet/tidalnawof36088@iistoria.com/Default/');