# SYNOPSIS 
[![NPM Package](https://img.shields.io/badge/npm-v1.1.2-blue.svg)](https://www.npmjs.org/package/moacjs-tx)
[![Build Status](https://travis-ci.org/wanpixiaozi/moacjs-tx.svg?branch=master)](https://travis-ci.org/wanpixiaozi/moacjs-tx)

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)  

# INSTALL
`npm install moacjs-tx`

# USAGE

  - [example](https://github.com/wanpixiaozi/moacjs-tx/blob/master/examples/transaction.js)

```javascript
`const Chain3 = require('chain3')
const chain3 = new Chain3(new Chain3.providers.HttpProvider('http://localhost:8545')) 
const MoacTx = require('moacjs-tx')
const privateKey = XXX

const txParams = {
  nonce: '0x00',
  gasPrice: '0x09184e72a000', 
  gasLimit: '0x2710',
  to: '0x0000000000000000000000000000000000000000', 
  value: '0x00', 
  data: '0x7f7465737432000000000000000000000000000000000000000000000000000000600057',
  shardingFlag: 0,
  // chainId - mainnet: 99, testnet: 101
  chainId: 101
}

const tx = new MoacTx(rawTx)
const serializedTx = tx.sign(fromSecret)
chain3.mc.sendRawTransaction(serializedTx, function (err, hash) {
    if (!err) {
      console.log('succeed: ', hash)
      return hash
    } else {
      console.log('error:', err)
      console.log('raw tx:', rawTx)
    }
})`
````

**Note:** this package expects ECMAScript 6 (ES6) as a minimum environment. From browsers lacking ES6 support, please use a shim (like [es6-shim](https://github.com/paulmillr/es6-shim)) before including any of the builds from this repo.


# BROWSER  
For a browser build please get from https://github.com/wanpixiaozi/moacjs-tx/blob/master/dist/moacjs-tx.min.js.

# API
[./docs/](./docs/index.md)

# LICENSE
[MPL-2.0](https://tldrlegal.com/license/mozilla-public-license-2.0-(mpl-2))
