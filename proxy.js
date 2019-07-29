var shell = require('shelljs');
const arg = process.argv[2].split('.')
const ip = arg[0] + '.' + arg[1] + '.' + arg[2] + '.'


shell.exec(`/sbin/ip route del ${ip}0/24 via ${ip}1 dev eth0 && /sbin/ip route add ${ip}0/24 dev eth0 proto kernel scope link src ${ip + arg[3]}`)