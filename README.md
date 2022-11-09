# dbs_arweave

A microservice for uploading files to Arweave. To be used with
[Ocean Protocol Decentralized Storage Backend](https://github.com/oceanprotocol/decentralized_storage_backend).

## Endpoints

### getQuote
Description: Gets a quote in order to store some files

Path: POST /getQuote

Arguments:

```json
{
    "type": "arweave",
    "files": [
                {"length":2343545},
                {"length":2343545},
            ],
    "duration": 4353545453
    "payment": {
        "chainId": 1,
        "tokenAddress": "0xWETH_on_ETHERUEM"
    },
    "userAddress": "0x456"
}
```

Where:

type: type of storage desired
files : array with files length
duration: how long to store this files (in seconds) (irrelevent for Arweave storage)
payment.chainId: chainId that will be used to make the payment
payment.token: token that will be used to make the payment
userAddress: address from which payment is pulled
Returns:

```json
{
    "tokenAmount": 500,
    "approveAddress": "0x123",
    "chainId": 1,
    "tokenAddress": "0xWETH_on_MAINNET",
    "quoteId": "xxxx"
}
```

Where:

- tokenAmount - tokenAmount that needs to be approved
- approveAddress - The address of the microservice that needs to be approved (microservice will do a transferFrom to get the payment)
- chainId - chainId used for payment
- tokenAddress - token that will be used to make the payment
- quoteId  - backend server will generate a quoteId


### upload
Description: Upload some files

Path: POST /upload

Input:

```json
{
    "quoteId": "23",
    "nonce": 12345.12345,
    "signature": "0x2222",
    "files":[
        "ipfs://xxxx","ipfs://yyyy"]
}
```

Microservice will upload files to Arweave and it will take the payment

Returns: `200 OK` if all the pre-checks pass. Upload occurs asynchronously.
Call `getStatus` to monitor status.

### getStatus
Description: Gets status for a job

Path: POST /getStatus?quoteId=xxx

Returns:

```json
{
    "status": 0,
}
```

Where:

Status | Status Description
-- | --
0 | No such quote
1-99 | Waiting for files to be uploaded by the user
100-199 | Processing payment
200-299 | Processing payment failure modes
300-399 | Uploading files to storage
400 | Upload done
401-499 | Upload failure modes

### getLink
Description: Gets DDO files object for a job

Path: POST /getLink?quoteId=xxx&nonce=1&signature=0xXXXXX

Input:

```json
{
    "quoteId": "23",
    "nonce": 12345.12345,
    "signature": "0x2222"
}

```

Where:

- quoteId
- nonce (timestamp) (has to be higher then previous stored nonce for this user)
- signature: user signed hash of SHA256(quoteID+nonce)

Returns:

```json
[
    {
       "type": "arweave",
       "transactionHash": "xxxx",
    }
]
```

## Register

Every 10 minutes (configurable), Arweave microservice should register itself to
DBS, using the `register` endpoint. DBS_URI will be defined as env.

POST  DBS_URI/register

```json
{
    "type": "arweave",
    "description":  "File storage on Arweave",
    "url": "http://microservice.url",
    "payment":
            [
                {
                    "chainId": 1,
                    "acceptedTokens":
                        [
                            { "OCEAN": "0xWETH_on_ETHEREUM" } ,
                            { "DAI": "0xOCEAN_ON_ETHEREUM" }
                        ]
                },
                {
                    "chainId": 137,
                    "acceptedTokens":
                        [
                            { "OCEAN": "0xWMATIC_on_POLYGON" },
                            { "DAI": "0xOCEAN_ON_POLYGON" }
                        ]
                }
            ]
}
```

## Install

```bash
npm install
```

## Run

```bash
export ACCEPTED_PAYMENTS=ethereum,matic
export NODE_RPC_URIS=default,default
export BUNDLR_URI="https://node1.bundlr.network"
#export BUNDLR_URI="https://devnet.bundlr.network" # Use Budnlr devnet when interacting with testnets
export PORT=8081
export PRIVATE_KEY="0000000000000000000000000000000000000000000000000000000000000000"
export SQLITE_DB_PATH=/path/to/db/file
export REGISTRATION_INTERVAL=30000 # default: 30000 ms
export DBS_URI="https://localhost" # "DEBUG" to skip registration
export SELF_URI="https://localhost"
export IPFS_GATEWAY="https://cloudflare-ipfs.com/ipfs/" # should have trailing slash
export ARWEAVE_GATEWAY="https://arweave.net/" # should have trailing slash
export MAX_UPLOAD_SIZE=1099511627776 # in bytes, 0 means unlimited
export BUNDLR_BATCH_SIZE=1 # default: 1 (chunk at a time)
export BUNDLR_CHUNK_SIZE=524288 # default: 524288 (512 kB)
export BUNDLR_PRICE_BUFFER=10 # percent, default: 10
export GAS_PRICE_BUFFER=10 # percent, default: 10

npm start
```

## Test

Testing requires two accounts:

PRIVATE_KEY is the server account
TEST_PRIVATE_KEY is the client account

The server needs an operational reserve of native gas fee tokens, enough to cover
one full upload procedure (transferFrom, unwrap (withdraw), send, wrap (deposit), transfer).

The client needs sufficient wrapped token to cover upload fee + reimburse the
server's gas fees.

### Manual tests

```bash
export TEST_PRIVATE_KEY="0000000000000000000000000000000000000000000000000000000000000000"
export ENABLE_EXPENSIVE_TESTS=false

npm test
```

### Automated tests

This repo uses Github Actions to run the tests. The tests use public testnets:

* Goerli
* Mumbai

Tests: https://github.com/MantisClone/arweave-upload/blob/main/test
Config: https://github.com/MantisClone/arweave-upload/blob/main/.github/workflows/ci.yml

### Expensive, large upload test

The large upload test is run periodically (quarterly) via Github Actions. It
requires over 4 WMATIC in the client account (TEST_PRIVATE_KEY).

## Example Curl Commands

```bash
curl -d '{ "type":"arweave", "userAddress": "0x0000000000000000000000000000000000000000", "files": [{"length": 1048576}, {"length": 256}], "payment": {"chainId": 137, "tokenAddress": "0x0000000000000000000000000000000000000000"} }' -X POST -H 'Content-Type: application/json' http://localhost:8081/getQuote

curl -d '{ "quoteId":"60f7d48ccd08653b2ef2edfe4bbe4620", "signature": "0x0000000000000000000000000000000000000000", "files": ["https://example.com/", "ipfs://xxx"], "nonce": 0 }' -X POST -H 'Content-Type: application/json' http://localhost:8081/upload

curl -d '{ "type":"arweave", "userAddress": "0x0000000000000000000000000000000000000000", "files": [{"length": 1256}, {"length": 5969}], "payment": {"chainId": 80001, "tokenAddress": "0x0000000000000000000000000000000000001010"} }' -X POST -H 'Content-Type: application/json' http://localhost:8081/getQuote
curl -d '{ "quoteId":"40acc6937e1bd98631f47e7cbda72920", "signature": "0x0000000000000000000000000000000000000000", "files": ["https://example.com/", "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png"], "nonce": 0 }' -X POST -H 'Content-Type: application/json' http://localhost:8081/upload
curl 'http://localhost:8081/getStatus?quoteId=40acc6937e1bd98631f47e7cbda72920'
curl 'http://localhost:8081/getLink?quoteId=40acc6937e1bd98631f47e7cbda72920&signature=0x0000000000000000000000000000000000000000&nonce=0'
```
