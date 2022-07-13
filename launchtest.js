const { spawn } = require("child_process");

// await shell.exec('google-chrome-stable --no-sandbox --disable-gpu --disable-setuid-sandbox --no-first-run --disable-features=Translate --user-data-dir="puppet/' + player + login + '" --remote-debugging-port=' + port, { async: true, silent: true })


spawn('google-chrome-stable');