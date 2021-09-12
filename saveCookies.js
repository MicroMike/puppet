const shell = require('shelljs');

const arg = new RegExp(process.argv[2])
const ls = shell.exec('dir saveCookie', { silent: true })

ls.stdout.split('\n').forEach(loginT => {
  const login = loginT.split('DIR>')[1] && loginT.split('DIR>')[1].trim()
  if (arg.test(loginT)) {
    const log = 'aaa' + login
    if (!login) return
    shell.exec(`mkdir "saveCookie/${log}/Default"`)
    shell.exec(`xcopy /Y /E "saveCookie/${login}/Default/Local Storage" "saveCookie/${log}/Default/Local Storage\\"`)
    shell.exec(`xcopy /Y /E "saveCookie/${login}/Default/Session Storage" "saveCookie/${log}/Default/Session Storage\\"`)
    shell.exec(`xcopy /Y /E "saveCookie/${login}/Default/Sessions" "saveCookie/${log}/Default/Sessions\\"`)
    shell.exec(`xcopy /Y /E "saveCookie/${login}/Default/Storage" "saveCookie/${log}/Default/Storage\\"`)
    shell.exec(`rmdir /s /q "saveCookie/${login}"`)
    shell.exec(`move "saveCookie/${log}" "saveCookie/${login}"`)
    console.log('ok', login)
  }
})
