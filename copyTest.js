const shell = require('shelljs');

shell.exec('scp -r root@216.158.239.199:/root/puppet/tidalnawof36088@iistoria.com/Local Storage /root/puppet/puppet/ ', { silent: true })
shell.exec('scp -r root@216.158.239.199:/root/puppet/tidalnawof36088@iistoria.com/Session Storage /root/puppet/puppet/ ', { silent: true })