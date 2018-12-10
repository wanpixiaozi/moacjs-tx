const BN = require('bn.js')
const numberToBN = require('number-to-bn')
const _ = require('underscore')
const Buffer = require('safe-buffer').Buffer
const moacUtil = require('moacjs-util')

/**
 * This function is to resolve the issue
 * https://github.com/ethereum/web3.js/issues/1170
 */
function makeEven (hex) {
  if (hex.length % 2 === 1) {
    hex = hex.replace('0x', '0x0')
  }
  return hex
}

/**
 * Takes an input and transforms it into an BN
 *
 * @method toBN
 * @param {Number|String|BN} number, string, HEX string or BN
 * @return {BN} BN
 */
function toBN (number) {
  try {
    return numberToBN.apply(null, arguments)
  } catch (e) {
    throw new Error(e + ' Given value: "' + number + '"')
  }
}

/**
 * Converts value to it's hex representation
 *
 * @method numberToHex
 * @param {String|Number|BN} value
 * @return {String}
 */
function numberToHex (value) {
  if (_.isNull(value) || _.isUndefined(value)) {
    return value
  }

  if (!isFinite(value) && !moacUtil.isHexString(value)) {
    throw new Error('Given input "' + value + '" is not a number.')
  }

  var number = toBN(value)
  var result = number.toString(16)

  return number.lt(new BN(0)) ? '-0x' + result.substr(1) : '0x' + result
}

// To fix an error of 2 leading 0s
function trimLeadingZero (hex) {
  while (hex && hex.startsWith('0x00')) {
    hex = '0x' + hex.slice(4)
  }
  return hex
}

/**
 * Attempts to turn a value into a `Buffer`. As input it supports `Buffer`, `String`, `Number`,
 * null/undefined, `BN` and other objects with a `toArray()` method.
 * @param {*} v the value
 */
function toBuffer (v) {
  if (!Buffer.isBuffer(v)) {
    if (Array.isArray(v)) {
      v = Buffer.from(v)
    } else if (typeof v === 'string') {
      if (moacUtil.isHexString(v)) {
        v = Buffer.from(moacUtil.padToEven(moacUtil.stripHexPrefix(v)), 'hex')
      } else {
        v = Buffer.from(v)
      }
    } else if (typeof v === 'number') {
      v = moacUtil.intToBuffer(v)
    } else if (v === null || v === undefined) {
      v = Buffer.allocUnsafe(0)
    } else if (v.toArray) {
      // converts a BN to a Buffer
      v = Buffer.from(v.toArray())
    } else {
      throw new Error('invalid type')
    }
  }
  return v
}

/**
 * Converts a `Buffer` into a hex `String`
 * @param {Buffer} buf
 * @return {String}
 */
function bufferToHex (buf) {
  buf = toBuffer(buf)
  return '0x' + buf.toString('hex')
}

module.exports = {
  toBuffer: toBuffer,
  bufferToHex: bufferToHex,
  trimLeadingZero: trimLeadingZero,
  makeEven: makeEven,
  toBN: toBN,
  numberToHex: numberToHex
}
