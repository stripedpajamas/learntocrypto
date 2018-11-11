const sodium = require('sodium-native')
const jsonStream = require('duplex-json-stream')
const net = require('net')
const constants = require('../constants')

class Teller {
  constructor (port, profile) {
    let { publicKey, secretKey, previous } = profile
    if (!secretKey || !publicKey) {
      throw new Error('No key pair provided')
    }
    // save keypair as buffers in the class
    this.keys = {
      publicKey: Buffer.from(publicKey, 'hex'),
      secretKey: Buffer.from(secretKey, 'hex')
    }
    this.previous = previous
    this.port = port || 6993
    this.client = jsonStream(net.connect(this.port))
    this.client.on('data', (msg) => {
      this.previous = msg.previous || this.previous
      console.log('Client received:', msg)
    })

    // begin transactions with bank
    this.register()
  }
  signAndSend (msg) {
    const input = Buffer.from(JSON.stringify(msg))
    const signature = Buffer.alloc(sodium.crypto_sign_BYTES)
    sodium.crypto_sign_detached(signature, input, this.keys.secretKey)
    this.client.write({ data: msg, signature: signature.toString('hex') })
  }
  register () {
    this.client.write({
      data: {
        cmd: constants.COMMANDS.REGISTER,
        id: this.keys.publicKey.toString('hex')
      }
    })
    return this
  }
  deposit (amount) {
    this.signAndSend({
      cmd: constants.COMMANDS.DEPOSIT,
      amount,
      id: this.keys.publicKey.toString('hex'),
      previous: this.previous || null
    })
    return this
  }
  withdraw (amount) {
    this.signAndSend({
      cmd: constants.COMMANDS.WITHDRAW,
      amount,
      id: this.keys.publicKey.toString('hex'),
      previous: this.previous || null
    })
    return this
  }
  getBalance () {
    this.signAndSend({
      cmd: constants.COMMANDS.BALANCE,
      id: this.keys.publicKey.toString('hex')
    })
    return this
  }
  end () {
    this.client.end()
    return this.previous // to store
  }
}

module.exports = Teller
