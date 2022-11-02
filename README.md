# dbs_arweave
Arweave microservice for DBS

## Install

```bash
npm install
export ACCEPTED_PAYMENTS=ethereum,matic,boba,boba-eth
export JSON_RPC_URIS=default,default,default,default
export BUNDLR_URI="https://node1.bundlr.network"
#export BUNDLR_URI="https://devnet.bundlr.network" # Use Budnlr devnet when interacting with testnets
export PORT=8081
export PRIVATE_KEY="0000000000000000000000000000000000000000000000000000000000000000"
export TEST_PRIVATE_KEY="0000000000000000000000000000000000000000000000000000000000000000"
export SQLITE_DB_PATH=/path/to/db/file
export REGISTRATION_INTERVAL=30000 # default: 30000 ms
export DBS_URI="https://localhost" # "DEBUG" to skip registration
export SELF_URI="https://localhost"
export IPFS_GATEWAY="https://cloudflare-ipfs.com/ipfs/" # should have trailing slash
export ARWEAVE_GATEWAY="https://arweave.net/" # should have trailing slash
export MAX_UPLOAD_SIZE=1099511627776 # in bytes

npm start
```

## Example Curl Commands

```bash
curl -d '{ "type":"arweave", "userAddress": "0x0000000000000000000000000000000000000000", "files": [{"length": 1048576}, {"length": 256}], "payment": {"chainId": 137, "tokenAddress": "0x0000000000000000000000000000000000000000"} }' -X POST -H 'Content-Type: application/json' http://localhost:8081/getQuote

curl -d '{ "quoteId":"60f7d48ccd08653b2ef2edfe4bbe4620", "signature": "0x0000000000000000000000000000000000000000", "files": ["https://example.com/", "ipfs://xxx"], "nonce": 0 }' -X POST -H 'Content-Type: application/json' http://localhost:8081/upload

curl -d '{ "type":"arweave", "userAddress": "0x0000000000000000000000000000000000000000", "files": [{"length": 1256}, {"length": 5969}], "payment": {"chainId": 80001, "tokenAddress": "0x0000000000000000000000000000000000001010"} }' -X POST -H 'Content-Type: application/json' http://localhost:8081/getQuote
curl -d '{ "quoteId":"40acc6937e1bd98631f47e7cbda72920", "signature": "0x0000000000000000000000000000000000000000", "files": ["https://example.com/", "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png"], "nonce": 0 }' -X POST -H 'Content-Type: application/json' http://localhost:8081/upload
curl 'http://localhost:8081/getStatus?quoteId=40acc6937e1bd98631f47e7cbda72920'
curl 'http://localhost:8081/getLink?quoteId=40acc6937e1bd98631f47e7cbda72920&signature=0x0000000000000000000000000000000000000000&nonce=0'
```

## Example IPFS File
IPFS File Hash: QmcGV8fimB7aeBxnDqr7bSSLUWLeyFKUukGqDhWnvriQ3T`
File size: 77 bytes
Source: https://ipfsbrowser.com/

## Get current timestamp from command line
```bash
date '+%s'
```