const jsonStream = require('duplex-json-stream')
const net = require('net')
const constants = require('../constants')
const util = require('./util')
const log = require('./log')
const customers = require('./customers')

// when shutting down, encrypt and save log
process.on('SIGINT', () => {
  console.log('') // make things prettier :)
  console.log('Encrypting and saving transaction log...')
  log.write()
  console.log('Saving customer information')
  customers.write()
  console.log('Shutting down...')
  process.exit()
})

const commands = constants.COMMANDS

const server = net.createServer((s) => {
  const socket = jsonStream(s)

  socket.on('data', (message) => {
    console.log('Bank received:', message)
    const msg = message.data
    // handle registration logic
    if (msg.cmd === commands.REGISTER) {
      console.log('Registering customer')
      try {
        customers.register(msg.id)
      } catch (e) {
        socket.write({ msg: e.message })
        return
      }
      socket.write({ msg: constants.RESPONSES.REGISTRATION_SUCCESS })
      return
    }
    // begin normal message processing
    if (!msg.id || !customers.get(msg.id)) {
      socket.write({ msg: constants.RESPONSES.INVALID_CUSTOMER })
      return
    }
    // verify signature of message
    const customerPublicKey = Buffer.from(msg.id, 'hex')
    const verified = util.verify(message.signature, JSON.stringify(msg), customerPublicKey)
    if (!verified) {
      socket.write({ msg: constants.RESPONSES.UNAUTHORIZED })
      return
    }
    switch (msg.cmd) {
      case commands.BALANCE: {
        console.log('Sending balance')
        socket.write({ balance: util.getBalance(log.get(), msg.id) })
        break
      }
      case commands.DEPOSIT: {
        console.log('Depositing funds')
        let previous
        try {
          previous = log.push(msg)
        } catch (e) {
          socket.write({ msg: e.message })
          break
        }
        socket.write({ msg: constants.RESPONSES.DEPOSIT_SUCCESS, previous })
        break
      }
      case commands.WITHDRAW: {
        console.log('Withdrawing funds')
        const balance = util.getBalance(log.get(), msg.id)
        const requestedWithdraw = parseInt(msg.amount, 10)

        if (balance - requestedWithdraw < 0) {
          socket.write({ msg: constants.RESPONSES.INSUFFICIENT_FUNDS })
          break
        }

        let previous
        try {
          previous = log.push(msg)
        } catch (e) {
          socket.write({ msg: e.message })
          break
        }

        socket.write({ msg: constants.RESPONSES.WITHDRAW_SUCCESS, previous })
        break
      }
      default: {
        console.log('Command unknown')
        break
      }
    }
  })
})

console.log('Loading and verifying transaction log...')
server.listen(6993)
