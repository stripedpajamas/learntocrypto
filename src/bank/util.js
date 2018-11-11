const fs = require('fs')
const path = require('path')
const sodium = require('sodium-native')
const constants = require('../constants')

const commands = constants.COMMANDS

const keyPath = path.join(__dirname, constants.KEYFILE)
const txPath = path.join(__dirname, constants.TXLOGFILE)

const loadLogFile = () => {
  const txLog = fs.readFileSync(txPath, 'utf8')
  if (!txLog) throw new Error('Error opening transaction log')

  let parsed
  try {
    parsed = JSON.parse(txLog)
  } catch (e) {
    throw new Error('Error parsing transaction log')
  }

  return parsed
}

const loadOrCreateKeys = () => {
  // load secret keypair from file if present
  const keyFile = fs.readFileSync(keyPath, 'utf8')
  if (!keyFile) {
    // generate a keypair and save it
    const publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
    const secretKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES)
    const encryptionKey = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES)
    sodium.crypto_sign_keypair(publicKey, secretKey)
    sodium.randombytes_buf(encryptionKey)
    fs.writeFileSync(keyPath, JSON.stringify({
      publicKey: publicKey.toString('hex'),
      secretKey: secretKey.toString('hex'),
      encryptionKey: encryptionKey.toString('hex')
    }))
    return { publicKey, secretKey, encryptionKey }
  }
  let parsed
  try {
    parsed = JSON.parse(keyFile)
  } catch (e) {
    throw new Error('Error parsing key file')
  }

  // we want buffers
  return {
    publicKey: Buffer.from(parsed.publicKey, 'hex'),
    secretKey: Buffer.from(parsed.secretKey, 'hex'),
    encryptionKey: Buffer.from(parsed.encryptionKey, 'hex')
  }
}

const encrypt = (message, key) => {
  const input = Buffer.from(message)

  // random nonce
  const nonce = Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES)
  sodium.randombytes_buf(nonce)

  const ciphertext = Buffer.alloc(input.length + sodium.crypto_secretbox_MACBYTES)
  sodium.crypto_secretbox_easy(ciphertext, input, nonce, key)

  return {
    ciphertext: ciphertext.toString('hex'),
    nonce: nonce.toString('hex')
  }
}

const decrypt = (ciphertext, nonce, key) => {
  const ct = Buffer.from(ciphertext, 'hex')
  const n = Buffer.from(nonce, 'hex')

  // make a place to put the plaintext
  const plaintext = Buffer.alloc(ct.length - sodium.crypto_secretbox_MACBYTES)

  // decrypt message
  const success = sodium.crypto_secretbox_open_easy(plaintext, ct, n, key)

  if (!success) throw new Error('Failed to decrypt transaction log')
  return plaintext.toString()
}

const sign = (message, secretKey) => {
  const input = Buffer.from(message)
  const signature = Buffer.alloc(sodium.crypto_sign_BYTES)
  sodium.crypto_sign_detached(signature, input, secretKey)
  return signature.toString('hex')
}

const verify = (signature, message, publicKey) => {
  const sig = Buffer.from(signature, 'hex')
  const msg = Buffer.from(message)
  return sodium.crypto_sign_verify_detached(sig, msg, publicKey)
}

const hashToHex = (inputStr) => {
  const input = Buffer.from(inputStr)
  const output = Buffer.alloc(sodium.crypto_generichash_BYTES)
  sodium.crypto_generichash(output, input)
  return output.toString('hex')
}

const getBalance = (log, id) => {
  return log.reduce((total, entry) => {
    const tx = entry.value
    if (tx.id != id) { // eslint-disable-line
      return total
    }
    switch (tx.cmd) {
      case commands.DEPOSIT: {
        return total + parseInt(tx.amount, 10)
      }
      case commands.WITHDRAW: {
        return total - parseInt(tx.amount, 10)
      }
      default: {
        return total
      }
    }
  }, 0)
}

module.exports = {
  loadLogFile,
  loadOrCreateKeys,
  hashToHex,
  sign,
  verify,
  encrypt,
  decrypt,
  getBalance
}
