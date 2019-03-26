
const shell = require('shelljs');
process.setMaxListeners(Infinity)

shell.exec('git reset --hard HEAD && git clean -f && git pull && npm run big')
