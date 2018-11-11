module.exports = {
  TXLOGFILE: './data/txlog.json',
  KEYFILE: './data/keys.json',
  CUSTOMERSFILE: './data/customers.json',
  COMMANDS: {
    REGISTER: 'register',
    DEPOSIT: 'deposit',
    WITHDRAW: 'withdraw',
    BALANCE: 'balance'
  },
  RESPONSES: {
    UNAUTHORIZED: 'Message valid verification',
    INVALID_CUSTOMER: 'Send a valid id to transact',
    REGISTRATION_SUCCESS: 'Customer registration successful',
    DEPOSIT_SUCCESS: 'Deposit successful',
    WITHDRAW_SUCCESS: 'Withdraw successful',
    INSUFFICIENT_FUNDS: 'Unable to withdraw: insufficient funds'
  }
}
