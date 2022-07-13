const { exec } = require("child_process");

			// await shell.exec('google-chrome-stable --no-sandbox --disable-gpu --disable-setuid-sandbox --no-first-run --disable-features=Translate --user-data-dir="puppet/' + player + login + '" --remote-debugging-port=' + port, { async: true, silent: true })


exec('google-chrome-stable --no-sandbox --disable-gpu --disable-setuid-sandbox --no-first-run --disable-features=Translate', (error, stdout, stderr) => {
    if (error) {
        console.log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
});