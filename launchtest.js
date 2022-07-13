const { spawn } = require("child_process");

const ls = spawn("google-chrome-stable", ['--no-sandbox', '--disable-gpu', '--disable-setuid-sandbox', '--no-first-run', '--disable-features=Translate']);

ls.stdout.on("data", data => {
	console.log(`stdout: ${data}`);
});

// await shell.exec('google-chrome-stable --no-sandbox --disable-gpu --disable-setuid-sandbox --no-first-run --disable-features=Translate --user-data-dir="puppet/' + player + login + '" --remote-debugging-port=' + port, { async: true, silent: true })

spawn('google-chrome-stable');