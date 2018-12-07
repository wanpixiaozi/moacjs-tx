const Chain3 = require('chain3')
const Tx = require('../index.js')
const keythereum = require('keythereum')

const vnodeRpcAddr = 'http://gateway.moac.io/testnet' // vnode rpc addr & port, commonly is "http://localhost:8545"
const chain3 = new Chain3(new Chain3.providers.HttpProvider(vnodeRpcAddr))
const myJson = require('./config.json')

var vnodeDatadir = myJson.vnodeDatadir // moacnode目录，根据实际修改
var fromAddress = '0x83D6bCcD4a08082F0a46A73BF3d1e314147eC94E'
var password = myJson.password  // 账号密码，根据实际修改
var keyObject = keythereum.importFromFile(fromAddress, vnodeDatadir)
var fromSecret = keythereum.recover(password, keyObject)        // 私钥

function sendTx (amount, toAddress) {
  var txcount = chain3.mc.getTransactionCount(fromAddress)
  console.log('Get tx account', txcount)

  var gasPrice = 25000000000 * 1.2
  if (gasPrice < chain3.mc.gasPrice * 1.1) {
    gasPrice = chain3.mc.gasPrice * 1.1 // 最小设定为gasPrice的1.1倍
  }
  var gasLimit = 100000
  var value = chain3.toSha(amount, 'mc')
  var gasTotal = gasPrice * gasLimit + Number(value)
  console.log(gasPrice, gasLimit, value, chain3.fromSha(gasTotal, 'mc'))
  var rawTx = {
    from: fromAddress,
    to: toAddress,
    nonce: chain3.intToHex(txcount),
    gasPrice: chain3.intToHex(gasPrice),
    gasLimit: chain3.intToHex(gasLimit),
    value: chain3.intToHex(value),
    shardingFlag: 0,
    chainId: chain3.version.network
  }
  console.log('rawTx is ', rawTx)
  var tx = new Tx(rawTx)
  // 用私钥签名交易信息
  var serializedTx = tx.sign(fromSecret)

  console.log('serializedTx is ', serializedTx)

  chain3.mc.sendRawTransaction(serializedTx, function (err, hash) {
    if (!err) {
      console.log('succeed: ', hash)
      return hash
    } else {
      console.log('error:', err)
      console.log('raw tx:', rawTx)
    }
  })
}

sendTx(0.1, '0x83D6bCcD4a08082F0a46A73BF3d1e314147eC94E')
