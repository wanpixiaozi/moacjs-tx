const BN = require('bn.js')
const numberToBN = require('number-to-bn')
const _ = require('underscore')
const Buffer = require('safe-buffer').Buffer

/**
 * Is the string a hex string.
 *
 * @method check if string is hex string of specific length
 * @param {String} value
 * @param {Number} length
 * @returns {Boolean} output the string is a hex string
 */
function isHexString (value, length) {
  if (typeof value !== 'string' || !value.match(/^0x[0-9A-Fa-f]*$/)) {
    return false
  }

  if (length && value.length !== 2 + 2 * length) {
    return false
  }

  return true
}

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

function isHexPrefixed (str) {
  return str.slice(0, 2) === '0x'
}

// Removes 0x from a given String
function stripHexPrefix (str) {
  if (typeof str !== 'string') {
    return str
  }
  return isHexPrefixed(str) ? str.slice(2) : str
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

  if (!isFinite(value) && !isHexString(value)) {
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
 * RLP usage, the i
*/
function intToHex (i) {
  var hex = i.toString(16)
  if (hex.length % 2) {
    hex = '0' + hex
  }

  return hex
}

/*
 * Transfer
*/
function intToBuffer (i) {
  var hex = intToHex(i)
  return new Buffer(hex, 'hex')
}

/**
 * Attempts to turn a value into a `Buffer`. As input it supports `Buffer`, `String`, `Number`, null/undefined, `BN` and other objects with a `toArray()` method.
 * @param {*} v the value
 */
function toBuffer (v) {
  if (!Buffer.isBuffer(v)) {
    if (Array.isArray(v)) {
      v = Buffer.from(v)
    } else if (typeof v === 'string') {
      if (isHexString(v)) {
        v = Buffer.from(padToEven(stripHexPrefix(v)), 'hex')
      } else {
        v = Buffer.from(v)
      }
    } else if (typeof v === 'number') {
      v = intToBuffer(v)
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
  isHexString: isHexString,
  makeEven: makeEven,
  isHexPrefixed: isHexPrefixed,
  stripHexPrefix: stripHexPrefix,
  toBN: toBN,
  numberToHex: numberToHex
}
