
const shell = require('shelljs');
process.setMaxListeners(Infinity)

shell.exec('git reset --hard HEAD && git clean -f && git pull && find save/ -type f ! -iname "Cookies" -delete && npm run big')
