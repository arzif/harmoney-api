const { Account, Wallet } = require('@harmony-js/account')
const { HttpProvider, Messenger } = require('@harmony-js/network')
const { ChainID, ChainType, Unit } = require('@harmony-js/utils')
const { apiAddress, requestConfigs } = require('../constants')
const axios = require('axios').default
const bip39 = require('bip39')
const { Harmony } = require('@harmony-js/core')

const {
  generatePrivateKey,
  getPubkeyFromPrivateKey,
} = require('@harmony-js/crypto');



var express = require('express')
const res = require('express/lib/response')
var router = express.Router()


router.get('/account/balance/:address', function (req, res, next) {
  const { address } = req.params

  const account = new Account(
    address,
    new Messenger(
      new HttpProvider(apiAddress),
      ChainType.Harmony,
    ),
    ChainID.HmyTestnet,
  )
  account.getBalance().then(response => {
    res.json(response)
  })
})

router.get('/wallet/new', function (req, res, next) {
  const privateKey = generatePrivateKey();
  const publicKey = getPubkeyFromPrivateKey(privateKey);

  const wallet = new Wallet(
    new Messenger(
      new HttpProvider(apiAddress),
      ChainType.Harmony,
      ChainID.RootstockMainnet,
    ),
  );

  const account = wallet.addByPrivateKey(privateKey)
  account.privateKey

  return res.json({
    accountAddress: account.address,
    privateKey: account.privateKey,
    publicKey: account.publicKey,
    accountBech32Address: account.bech32Address,
  })
})

router.get('/wallet/in-transactions/:address', function (req, res, next) {
  const { address } = req.params

  const payload = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "hmyv2_getTransactionsHistory",
    "params": [
      {
        "address": address,
        "pageIndex": 0,
        "pageSize": 10,
        "fullTx": true,
        "txType": "RECEIVED",
        "order": "DESC"
      }
    ]
  }

  axios.post(apiAddress, payload, requestConfigs)
    .then(function (response) {
      const { transactions } = response.data.result || []
      res.json({
        result: {
          transactions
        }
      })
    })
})
router.get('/wallet/balance/:address', function (req, res, next) {
  const { address } = req.params

  const payload = {
    "id": "1",
    "jsonrpc": "2.0",
    "method": "hmyv2_getBalance",
    "params": [
      address
    ]
  }

  axios.post(apiAddress, payload, requestConfigs).then(response => {
    const { result } = response.data
    const balance = (+result > 0) ? (+result / 1000000000000000000) : 0

    res.json({
      result: {
        balance
      }
    })
  })
})

router.post('/tx/new', function (req) {
  const { to, privateKey, gasLimit, amount, gasPrice } = req.body;

  const hmy = new Harmony(
    apiAddress,
    {
      chainType: ChainType.Harmony,
      chainId: ChainID.HmyMainnet,
    },
  );

  const txn = hmy.transactions.newTx({
    to,
    value: new Unit(amount).asOne().toWei(),
    gasLimit,
    shardID: 0,
    toShardID: 0,
    gasPrice: new hmy.utils.Unit(gasPrice).asGwei().toWei(),
    data: '0x',
  });

  hmy.wallet.addByPrivateKey(privateKey)
  hmy.wallet.signTransaction(txn).then(signedTransaction => {
    signedTransaction.sendTransaction().then(([tx, hash]) => {
      res.json({
        result: { hash}
      })
    })
  })
});

module.exports = router
