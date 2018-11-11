const fs = require('fs')
const path = require('path')
const constants = require('../constants')

const customersFilePath = path.join(__dirname, constants.CUSTOMERSFILE)

class CustomerController {
  constructor () {
    // load up current customers
    const customersFile = fs.readFileSync(customersFilePath, 'utf8')
    this.customers = JSON.parse(customersFile) || []
  }
  get (id) {
    return this.customers[id]
  }
  register (id) {
    if (!id) {
      throw new Error('No customer id')
    }
    if (typeof this.customers[id] === 'undefined') {
      this.customers[id] = { id }
    }
    // if customer already exists this is a 'login'
  }
  write () {
    // persist to disk
    fs.writeFileSync(customersFilePath, JSON.stringify(this.customers))
  }
}

module.exports = new CustomerController()
