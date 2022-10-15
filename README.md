# arweave-upload
A micro-service used by Ocean Protocol for uploading files to Arweave

```bash
npm install
export ACCEPTED_PAYMENTS=ethereum,matic
export ARWEAVE_GATEWAY_URI="https://node1.bundlr.network"
export PORT=8081
export PRIVATE_KEY="0000000000000000000000000000000000000000000000000000000000000000"
export SQLITE_DB_PATH=/path/to/db/file
npm start
```

```bash
curl -d '{ "type":"arweave", "userAddress": "0x0000000000000000000000000000000000000000", "files": [{"length": 1048576}, {"length": 256}], "payment": {"chainId": 137, "tokenAddress": "0x0000000000000000000000000000000000000000"} }' -X POST -H 'Content-Type: application/json' http://localhost:8081/getQuote

curl -d '{ "quoteId":"d54a911f0c1dbdc4825fadcac00c94e6", "signature": "0x0000000000000000000000000000000000000000", "files": ["https://example.com/", "ipfs://xxx"], "nonce": "0" }' -X POST -H 'Content-Type: application/json' http://localhost:8081/upload
```