const cypress = require('cypress')

cypress.run({
    browser: '/usr/bin/google-chrome-stable --disk-cache-dir=amazon_beto.layn@mega.zik.dj',
    exit: false,
    config: {
        chromeWebSecurity: false,
    },
    env: {
        foo: 'bar',
        baz: 'quux',
    }
})