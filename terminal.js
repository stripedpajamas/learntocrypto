const fs = require('fs')
const path = require('path')
const prompts = require('prompts')
const sodium = require('sodium-native')
const Teller = require('./src/teller')

async function getProfile () {
  let profileOutput
  let profilePath
  const profilesPath = path.join(__dirname, './keys')
  const existingProfiles = fs.readdirSync(profilesPath)
    .map((profile) => ({
      title: path.basename(profile, '.json'),
      value: path.join(profilesPath, profile)
    }))
  let response = await prompts({
    type: 'select',
    name: 'profile',
    message: 'Pick a user profile:',
    choices: [
      ...existingProfiles,
      { title: 'Create new profile', value: 'new' }
    ]
  })
  if (response.profile === 'new') {
    // get a name
    response = await prompts({
      type: 'text',
      name: 'name',
      message: 'Name the profile:'
    })
    profilePath = path.join(profilesPath, response.name + '.json')
    // create a keypair and save it
    const publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
    const secretKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES)
    sodium.crypto_sign_keypair(publicKey, secretKey)
    profileOutput = {
      publicKey: publicKey.toString('hex'),
      secretKey: secretKey.toString('hex'),
      previous: null
    }
    fs.writeFileSync(profilePath, JSON.stringify(profileOutput))
  } else {
    // load json file and parse it
    const file = fs.readFileSync(response.profile, 'utf8')
    profileOutput = JSON.parse(file)
    profilePath = response.path
  }
  return { profile: profileOutput, profilePath: profilePath }
}

async function getCommand () {
  const choices = [
    { title: 'Get balance', value: 'balance' },
    { title: 'Deposit funds', value: 'deposit' },
    { title: 'Withdraw funds', value: 'withdraw' },
    { title: 'Quit', value: 'quit' }
  ]
  return prompts({
    type: 'select',
    name: 'command',
    message: 'Pick a command:',
    choices
  })
}

async function getAmount () {
  const response = await prompts({
    type: 'number',
    name: 'amount',
    message: 'How much?'
  })
  return response.amount
}

async function wait () {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, 500)
  })
}

async function writeProfile (profile, profilePath, previous) {
  const data = {
    ...profile,
    previous
  }
  fs.writeFileSync(profilePath, JSON.stringify(data))
}

async function main () {
  const { profile, profilePath } = await getProfile()
  const teller = new Teller(6993, profile)
  await wait()

  let response = await getCommand()
  while (response.command !== 'quit') {
    switch (response.command) {
      case 'balance': {
        teller.getBalance()
        break
      }
      case 'deposit': {
        const amount = await getAmount()
        teller.deposit(amount)
        break
      }
      case 'withdraw': {
        const amount = await getAmount()
        teller.withdraw(amount)
        break
      }
    }
    await wait()
    response = await getCommand()
  }
  const finalPrevious = teller.end()
  writeProfile(profile, profilePath, finalPrevious)
  process.exit(0)
}

main()
