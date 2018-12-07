const argv = require('minimist')(process.argv.slice(2))

if (argv.a) {
  require('./api.js')
} else if (argv.t) {
  require('./transactionRunner.js')
} else {
  require('./api.js')
  require('./transactionRunner.js')
}
