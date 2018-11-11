terminal:
- choose a profile (json file in keys folder)
- or create a profile (generate keypair and save in keys folder)
  - new profile ask for name
- create a new instance of Teller with this keypair

teller: 
- upon creation, fire `register` with public key
- sign all messages with secret key
- send public key up as customer id with every request

bank:
- `register` cmd should register or login and send back success
- on any other message, verify that signature is valid to public key of customer before processing