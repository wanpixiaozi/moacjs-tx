const Chain3 = require('chain3')
const Tx = require('../index.js')
// const keythereum = require('keythereum')

const vnodeRpcAddr = 'http://localhost:8545' // vnode rpc addr & port, commonly is "http://localhost:8545"
const chain3 = new Chain3(new Chain3.providers.HttpProvider(vnodeRpcAddr))
// const myJson = require('./config.json')

// var vnodeDatadir = myJson.vnodeDatadir // moacnode目录，根据实际修改
var fromAddress = '0x83D6bCcD4a08082F0a46A73BF3d1e314147eC94E'
// var password = myJson.password  // 账号密码，根据实际修改
// var keyObject = keythereum.importFromFile(fromAddress, vnodeDatadir)
// var fromSecret = keythereum.recover(password, keyObject)        // 私钥
// var newKey = JSON.parse(JSON.stringify(fromSecret))
// console.log('from secret is ', newKey)
var fromSecret = [ 120,
  16,
  188,
  42,
  99,
  150,
  25,
  246,
  22,
  6,
  183,
  137,
  237,
  5,
  114,
  59,
  148,
  58,
  87,
  120,
  89,
  65,
  34,
  95,
  28,
  215,
  16,
  160,
  29,
  196,
  206,
  243 ]

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

  // test
  // tx.sign(fromSecret)

  // var serializedTx = tx.serialize()
  // console.log('0x' + serializedTx.toString('hex'))

  // 用私钥签名交易信息
  var serializedTx = tx.sign(fromSecret)
  console.log(serializedTx)
  // console.log('serializedTx is ', serializedTx)
  // chain3.mc.sendRawTransaction(('0x' + serializedTx.toString('hex')), function (err, hash) {
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
