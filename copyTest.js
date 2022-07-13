const { exec } = require("child_process");

exec('mkdir -p /root/puppet/puppet/tidalnawof36088@iistoria.com/Default')
exec('scp -r root@216.158.239.199:"/root/puppet/tidalnawof36088@iistoria.com/Default/Session\\ Storage" /root/puppet/puppet/tidalnawof36088@iistoria.com/Default/')
exec('scp -r root@216.158.239.199:"/root/puppet/tidalnawof36088@iistoria.com/Default/Local\\ Storage" /root/puppet/puppet/tidalnawof36088@iistoria.com/Default/');

exec('mkdir -p /root/puppet/puppet/amazondirn.maks@protonmail.com/Default')
exec('scp -r root@216.158.239.199:"/root/puppet/amazondirn.maks@protonmail.com/Default/Session\\ Storage" /root/puppet/puppet/amazondirn.maks@protonmail.com/Default/')
exec('scp -r root@216.158.239.199:"/root/puppet/amazondirn.maks@protonmail.com/Default/Local\\ Storage" /root/puppet/puppet/amazondirn.maks@protonmail.com/Default/');
// exec('scp -r root@216.158.239.199:"/root/puppet/amazondirn.maks@protonmail.com/Default/Login\\ Data\\ For\\ Account-journal" /root/puppet/puppet/amazondirn.maks@protonmail.com/Default/');
exec('scp -r root@216.158.239.199:"/root/puppet/amazondirn.maks@protonmail.com/Default/Login\\ Data\\ For\\ Account" /root/puppet/puppet/amazondirn.maks@protonmail.com/Default/');
// exec('scp -r root@216.158.239.199:"/root/puppet/amazondirn.maks@protonmail.com/Default/Login\\ Data-journal" /root/puppet/puppet/amazondirn.maks@protonmail.com/Default/');
exec('scp -r root@216.158.239.199:"/root/puppet/amazondirn.maks@protonmail.com/Default/Login\\ Data" /root/puppet/puppet/amazondirn.maks@protonmail.com/Default/');
// exec('scp -r root@216.158.239.199:"/root/puppet/amazondirn.maks@protonmail.com/Default/Cookies-journal" /root/puppet/puppet/amazondirn.maks@protonmail.com/Default/');
exec('scp -r root@216.158.239.199:"/root/puppet/amazondirn.maks@protonmail.com/Default/Cookies" /root/puppet/puppet/amazondirn.maks@protonmail.com/Default/');