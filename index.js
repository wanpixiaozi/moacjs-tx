'use strict'
const moacUtil = require('moacjs-util')
const fees = require('ethereum-common/params.json')
const BN = moacUtil.BN
const RLP = require('eth-lib/lib/rlp')
const Bytes = require('eth-lib/lib/bytes')
const utils = require('./utils.js')
const Hash = require('eth-lib/lib/hash')
const secp256k1 = require('secp256k1')

// secp256k1n/2
const N_DIV_2 = new BN('7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0', 16)

/**
 * ECDSA sign
 * @param {Buffer} msgHash
 * @param {Buffer} privateKey
 * @return {Object}
 */
function ecsign (msgHash, privateKey) {
  // Convert the input string to Buffer
  if (typeof msgHash === 'string') {
    if (utils.isHexString(msgHash)) {
      msgHash = Buffer.from(utils.makeEven(utils.stripHexPrefix(msgHash)), 'hex')
    }
  }

  var privateKeyBuf = new Buffer(privateKey, 'hex')

  var sig = secp256k1.sign(msgHash, privateKeyBuf)

  var ret = {}
  ret.r = sig.signature.slice(0, 32)
  ret.s = sig.signature.slice(32, 64)
  ret.v = sig.recovery + 27

  return ret
}

/**
 * Creates a new transaction object.
 *
 * @example
 * var rawTx = {
 *   nonce: '0x00',
 *   gasPrice: '0x09184e72a000',
 *   gasLimit: '0x2710',
 *   to: '0x0000000000000000000000000000000000000000',
 *   value: '0x00',
 *   data: '0x7f7465737432000000000000000000000000000000000000000000000000000000600057',
 *   v: '0x1c',
 *   r: '0x5e1d3a76fbf824220eafc8c79ad578ad2b67d01b0c2425eb1f1347e8f50882ab',
 *   s: '0x5bd428537f05f9830e93792f90ea6a3e2d1ee84952dd96edbae9f658f831ab13'
 * };
 * var tx = new Transaction(rawTx);
 *
 * @class
 * @param {Buffer | Array | Object} data a transaction can be initialized with either a buffer containing the RLP serialized transaction or an array of buffers relating to each of the tx Properties, listed in order below in the exmple.
 *
 * Or lastly an Object containing the Properties of the transaction like in the Usage example.
 *
 * For Object and Arrays each of the elements can either be a Buffer, a hex-prefixed (0x) String , Number, or an object with a toBuffer method such as Bignum
 *
 * @property {Buffer} raw The raw rlp encoded transaction
 * @param {Buffer} data.nonce nonce number
 * @param {Buffer} data.gasLimit transaction gas limit
 * @param {Buffer} data.gasPrice transaction gas price
 * @param {Buffer} data.to to the to address
 * @param {Buffer} data.value the amount of moac sent
 * @param {Buffer} data.data this will contain the data of the message or the init of a contract
 * @param {Buffer} data.v EC recovery ID
 * @param {Buffer} data.r EC signature parameter
 * @param {Buffer} data.s EC signature parameter
 * @param {Number} data.chainId moac chainId - mainnet: 99, testnet: 101
 * */

class Transaction {
  constructor (data) {
    data = data || {}
    // Define Properties
    const fields = [{
      name: 'nonce',
      length: 32,
      allowLess: true,
      default: new Buffer([])
    }, {
      name: 'gasPrice',
      length: 32,
      allowLess: true,
      default: new Buffer([])
    }, {
      name: 'gasLimit',
      alias: 'gas',
      length: 32,
      allowLess: true,
      default: new Buffer([])
    }, {
      name: 'to',
      allowZero: true,
      length: 20,
      default: new Buffer([])
    }, {
      name: 'value',
      length: 32,
      allowLess: true,
      default: new Buffer([])
    }, {
      name: 'data',
      alias: 'input',
      allowZero: true,
      default: new Buffer([])
    }, {
      name: 'v',
      allowZero: true,
      default: new Buffer([0x1c])
    }, {
      name: 'r',
      length: 32,
      allowZero: true,
      allowLess: true,
      default: new Buffer([])
    }, {
      name: 's',
      length: 32,
      allowZero: true,
      allowLess: true,
      default: new Buffer([])
    }]

    /**
     * Returns the rlp encoding of the transaction
     * @method serialize
     * @return {Buffer}
     * @memberof Transaction
     * @name serialize
     * @see {@link https://github.com/wanpixiaozi/moacjs-tx/blob/master/docs/index.md#defineproperties|moacjs-util}
     */
    /**
     * Returns the transaction in JSON format
     * @method toJSON
     * @return {Array | String}
     * @memberof Transaction
     * @name toJSON
     * @see {@link https://github.com/wanpixiaozi/moacjs-tx/blob/master/docs/index.md#defineproperties|moacjs-util}
     */
    // attached serialize
    moacUtil.defineProperties(this, fields, data)

    /**
     * @property {Buffer} from (read only) sender address of this transaction, mathematically derived from other parameters.
     * @name from
     * @memberof Transaction
     */
    Object.defineProperty(this, 'from', {
      enumerable: true,
      configurable: true,
      get: this.getSenderAddress.bind(this)
    })

    // calculate chainId from signature
    let sigV = moacUtil.bufferToInt(this.v)
    let chainId = Math.floor((sigV - 35) / 2)
    if (chainId < 0) chainId = 0

    // set chainId
    this._chainId = chainId || data.chainId || 0
    this._homestead = true

    this.tx = data // used for moac sign process
  }

  /**
   * If the tx's `to` is to the creation address
   * @return {Boolean}
   */
  toCreationAddress () {
    return this.to.toString('hex') === ''
  }

  /**
   * Computes a sha3-256 hash of the serialized tx
   * @param {Boolean} [includeSignature=true] whether or not to inculde the signature
   * @return {Buffer}
   */
  hash (includeSignature) {
    if (includeSignature === undefined) includeSignature = true

    // EIP155 spec:
    // when computing the hash of a transaction for purposes of signing or recovering,
    // instead of hashing only the first six elements (ie. nonce, gasprice, startgas, to, value, data),
    // hash nine elements, with v replaced by CHAIN_ID, r = 0 and s = 0

    let items
    if (includeSignature) {
      items = this.raw
    } else {
      if (this._chainId > 0) {
        const raw = this.raw.slice()
        this.v = this._chainId
        this.r = 0
        this.s = 0
        items = this.raw
        this.raw = raw
      } else {
        items = this.raw.slice(0, 6)
      }
    }

    // create hash
    return moacUtil.rlphash(items)
  }

  /**
   * returns chain ID
   * @return {Buffer}
   */
  getChainId () {
    return this._chainId
  }

  /**
   * returns the sender's address
   * @return {Buffer}
   */
  getSenderAddress () {
    if (this._from) {
      return this._from
    }
    const pubkey = this.getSenderPublicKey()
    this._from = moacUtil.publicToAddress(pubkey)
    return this._from
  }

  /**
   * returns the public key of the sender
   * @return {Buffer}
   */
  getSenderPublicKey () {
    if (!this._senderPubKey || !this._senderPubKey.length) {
      if (!this.verifySignature()) throw new Error('Invalid Signature')
    }
    return this._senderPubKey
  }

  /**
   * Determines if the signature is valid
   * @return {Boolean}
   */
  verifySignature () {
    const msgHash = this.hash(false)
    // All transaction signatures whose s-value is greater than secp256k1n/2 are considered invalid.
    if (this._homestead && new BN(this.s).cmp(N_DIV_2) === 1) {
      return false
    }

    try {
      let v = moacUtil.bufferToInt(this.v)
      if (this._chainId > 0) {
        v -= this._chainId * 2 + 8
      }
      this._senderPubKey = moacUtil.ecrecover(msgHash, v, this.r, this.s)
    } catch (e) {
      return false
    }

    return !!this._senderPubKey
  }

  /**
   * sign a transaction with a given private key
   * @param {Buffer} privateKey Must be 32 bytes in length
   * eth old func, moac never use it
   *
   * sign (privateKey) {
   *  const msgHash = this.hash(false)
   *  const sig = moacUtil.ecsign(msgHash, privateKey)
   *  if (this._chainId > 0) {
   *     sig.v += this._chainId * 2 + 8
   *  }
   *  Object.assign(this, sig)
   * }
   **/

  /*
   * A simple signTransaction function to sign
   * the input TX with private key.
   * Input:
   * tx - a JSON format object contains the input TX info
   * privateKey - a string format of the private key
   * Output:
   * rawTransaction - a String, can be used with
   *                  chain3.mc.sendRawTransaction
   *
   *
  */
  sign (privateKey) {
    const tx = this.tx
    // console.log('enter sign process')
    // Check the input fields of the tx
    if (tx.chainId < 1) {
      return new Error('"Chain ID" is invalid')
    }

    if (!tx.gas && !tx.gasLimit) {
      return new Error('"gas" is missing')
    }

    if (tx.nonce < 0 ||
      tx.gasLimit < 0 ||
      tx.gasPrice < 0 ||
      tx.chainId < 0) {
      return new Error('Gas, gasPrice, nonce or chainId is lower than 0')
    }
    // Sharding Flag only accept the
    // If input has not sharding flag, set it to 0 as global TX.
    if (tx.shardingFlag === undefined) {
      // console.log("Set default sharding to 0");
      this.shardingFlag = 0
    }
// console.log("HEX 0:", utils.numberToHex(0));
    try {
      // Make sure all the number fields are in HEX format

      var transaction = tx
      transaction.to = tx.to || '0x' // Can be zero, for contract creation
      transaction.data = tx.data || '0x' // can be zero for general TXs
      transaction.value = tx.value || '0x' // can be zero for contract call
      transaction.chainId = utils.numberToHex(tx.chainId)
      transaction.shardingFlag = utils.numberToHex(tx.shardingFlag)
      transaction.systemContract = '0x0' // System contract flag, always = 0
      transaction.via = tx.via || '0x' // vnode subchain address
      // console.log('RLP encoded transaction:', transaction)
      // Encode the TX for signature
      //   type txdata struct {
      // AccountNonce uint64          `json:"nonce"    gencodec:"required"`
      // SystemContract uint64          `json:"syscnt" gencodec:"required"`
      // Price        *big.Int        `json:"gasPrice" gencodec:"required"`
      // GasLimit     *big.Int        `json:"gas"      gencodec:"required"`
      //   // nil means contract creation
      // Amount       *big.Int        `json:"value"    gencodec:"required"`
      // Payload      []byte          `json:"input"    gencodec:"required"`
      // ShardingFlag uint64 `json:"shardingFlag" gencodec:"required"`
      // Via            *common.Address `json:"to"       rlp:"nil"`

      // // Signature values
      // V *big.Int `json:"v" gencodec:"required"`
      // R *big.Int `json:"r" gencodec:"required"`
      // S *big.Int `json:"s" gencodec:"required"`
      // console.log("chain3 tx:", transaction);
      const rlpEncoded = RLP.encode([
        Bytes.fromNat(transaction.nonce),
        Bytes.fromNat(transaction.systemContract),
        Bytes.fromNat(transaction.gasPrice),
        Bytes.fromNat(transaction.gasLimit),
        transaction.to.toLowerCase(),
        Bytes.fromNat(transaction.value),
        transaction.data,
        Bytes.fromNat(transaction.shardingFlag),
        transaction.via.toLowerCase(),
        Bytes.fromNat(transaction.chainId),
        '0x',
        '0x'])
      // console.log('chain3 rlpEncoded:', rlpEncoded)

      const hash = Hash.keccak256(rlpEncoded)
      // console.log('chain3 hashed after rlpEncoded:', hash)

      // for MOAC, keep 9 fields instead of 6
      const vPos = 9
      // Sign the hash with the private key to produce the
      // V, R, S
      const newsign = ecsign(hash, utils.stripHexPrefix(privateKey))
      // console.log("Sign:", privateKey);
      // console.log("chain3 newsign:", newsign);

      const rawTx = RLP.decode(rlpEncoded).slice(0, vPos + 3)

      // Replace the V field with chainID info
      const newV = newsign.v + 8 + transaction.chainId * 2

      // Add trimLeadingZero to avoid '0x00' after makeEven
      // don't allow uneven r,s,v values
      rawTx[vPos] = utils.trimLeadingZero(utils.makeEven(utils.bufferToHex(newV)))
      rawTx[vPos + 1] = utils.trimLeadingZero(utils.makeEven(utils.bufferToHex(newsign.r)))
      rawTx[vPos + 2] = utils.trimLeadingZero(utils.makeEven(utils.bufferToHex(newsign.s)))
      // console.log('chain3 Signed rawTx:', rawTx)
      return RLP.encode(rawTx)
    } catch (e) {
      return e
    }
  }

  /**
   * The amount of gas paid for the data in this tx
   * @return {BN}
   */
  getDataFee () {
    const data = this.raw[5]
    const cost = new BN(0)
    for (let i = 0; i < data.length; i++) {
      data[i] === 0 ? cost.iaddn(fees.txDataZeroGas.v) : cost.iaddn(fees.txDataNonZeroGas.v)
    }
    return cost
  }

  /**
   * the minimum amount of gas the tx must have (DataFee + TxFee + Creation Fee)
   * @return {BN}
   */
  getBaseFee () {
    const fee = this.getDataFee().iaddn(fees.txGas.v)
    if (this._homestead && this.toCreationAddress()) {
      fee.iaddn(fees.txCreation.v)
    }
    return fee
  }

  /**
   * the up front amount that an account must have for this transaction to be valid
   * @return {BN}
   */
  getUpfrontCost () {
    return new BN(this.gasLimit)
      .imul(new BN(this.gasPrice))
      .iadd(new BN(this.value))
  }

  /**
   * validates the signature and checks to see if it has enough gas
   * @param {Boolean} [stringError=false] whether to return a string with a description of why the validation failed or return a Boolean
   * @return {Boolean|String}
   */
  validate (stringError) {
    const errors = []
    if (!this.verifySignature()) {
      errors.push('Invalid Signature')
    }

    if (this.getBaseFee().cmp(new BN(this.gasLimit)) > 0) {
      errors.push([`gas limit is too low. Need at least ${this.getBaseFee()}`])
    }

    if (stringError === undefined || stringError === false) {
      return errors.length === 0
    } else {
      return errors.join(' ')
    }
  }
}

module.exports = Transaction
