
const shell = require('shelljs');
process.setMaxListeners(Infinity)

shell.exec('cp runner.js node_modules/nightmare/lib/runner.js')
shell.exec('git reset --hard HEAD && git clean -f && git pull && npm run big')
