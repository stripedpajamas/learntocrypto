const fs = require('fs')
const path = require('path')
const constants = require('../constants')
const util = require('./util')

const txPath = path.join(__dirname, constants.TXLOGFILE)

class Log {
  constructor () {
    // load up log and keys
    const encryptedLog = util.loadLogFile()
    this.keys = util.loadOrCreateKeys()
    this.genesisHash = Buffer.alloc(32).toString('hex')

    // decrypt log file
    if (encryptedLog.ciphertext && encryptedLog.nonce) {
      const decrypted = util.decrypt(
        encryptedLog.ciphertext,
        encryptedLog.nonce,
        this.keys.encryptionKey
      )
      this.log = JSON.parse(decrypted) || []
    } else {
      this.log = []
    }

    // verify log
    this.verify()
  }
  get () {
    return this.log
  }
  push (entry) {
    // find previous transaction from this customer
    let previous = null
    for (let i = this.log.length - 1; i >= 0; i--) {
      if (this.log[i].value.id === entry.id) {
        previous = this.log[i].hash
        break
      }
    }
    // confirm entry agrees
    if (entry.previous !== previous) {
      throw new Error('Previous hash incorrect')
    }

    const lastHash = this.log.length ? this.log[this.log.length - 1].hash : this.genesisHash
    const hash = util.hashToHex(`${lastHash}${JSON.stringify(entry)}`)

    // sign the hash
    const signature = util.sign(hash, this.keys.secretKey)

    const transaction = {
      value: entry,
      hash,
      signature
    }

    this.log.push(transaction)

    return hash
  }
  write () {
    // encrypt and save to disk
    const enc = util.encrypt(JSON.stringify(this.log), this.keys.encryptionKey)
    fs.writeFileSync(txPath, JSON.stringify(enc))
  }
  verify () {
    const logFinalHash = this.log.length ? this.log[this.log.length - 1].hash : this.genesisHash

    // very hash chain
    const finalHash = this.log.reduce((previousHash, tx) => {
      return util.hashToHex(`${previousHash}${JSON.stringify(tx.value)}`)
    }, this.genesisHash)

    // also verify the hashes have valid signatures
    const allValidSignatures = this.log.every((entry) => {
      return util.verify(entry.signature, entry.hash, this.keys.publicKey)
    })

    return logFinalHash === finalHash && allValidSignatures
  }
}

module.exports = new Log()
