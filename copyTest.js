const { exec } = require("child_process");

exec('mkdir -p /root/puppet/puppet/amazondirn.maks@protonmail.com/Default')
exec('scp -r root@216.158.239.199:"/root/puppet/amazondirn.maks@protonmail.com/Default/Session\\ Storage" /root/puppet/puppet/amazondirn.maks@protonmail.com/Default/')
exec('scp -r root@216.158.239.199:"/root/puppet/amazondirn.maks@protonmail.com/Default/Local\\ Storage" /root/puppet/puppet/amazondirn.maks@protonmail.com/Default/');