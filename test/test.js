const ethers = require("ethers");
const axios = require("axios");
const { expect } = require("chai");
const { getQuote, waitForUpload } = require("./test.helpers.js");
const Quote = require("../app/models/quote.model.js");

describe("DBS Arweave Upload", function () {
    const provider = ethers.getDefaultProvider("https://rpc-mumbai.maticvigil.com/");
    const wallet = new ethers.Wallet(process.env.TEST_PRIVATE_KEY, provider);
    console.log("Wallet address: " + wallet.address);

    describe("getQuote", function () {

        it("should respond 400 when request is empty", async function () {
            const res = await axios.post(`http://localhost:8081/getQuote`).catch((err) => err.response);
            expect(res.status).equals(400);
            expect(res.data.message).contains("Missing type");
        });

        it("should respond 200 when request is valid", async function () {
            const res = await getQuote(wallet).catch((err) => err.response);
            expect(res.status).equals(200);
            expect(res.data).contains.all.keys(
                "quoteId",
                "chainId",
                "tokenAddress",
                "tokenAmount",
                "approveAddress"
            );
        });

        it("should respond 200 when request is valid, even when file is 1 TB", async function () {
            const TB = 1_000_000_000_000;
            const res = await getQuote(wallet, TB).catch((err) => err.response);
            expect(res.status).equals(200);
            expect(res.data).contains.all.keys(
                "quoteId",
                "chainId",
                "tokenAddress",
                "tokenAmount",
                "approveAddress"
            );
        });
    });

    describe("Integration tests", function () {

        describe("without approval", function () {

            it("should fail to pull funds from user account", async function() {
                this.timeout(20 * 1000);

                const getQuoteResponse = await getQuote(wallet).catch((err) => err.response);
                const quote = getQuoteResponse.data;

                const nonce = Math.floor(new Date().getTime()) / 1000;
                const message = ethers.utils.sha256(ethers.utils.toUtf8Bytes(quote.quoteId + nonce.toString()));
                const signature = await wallet.signMessage(message);
                const uploadResponse = await axios.post(`http://localhost:8081/upload`, {
                    quoteId: quote.quoteId,
                    files: ["ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", "ipfs://QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx"],
                    nonce: nonce,
                    signature: signature,
                }).catch((err) => err.response);
                expect(uploadResponse.status).equals(400);
                expect(uploadResponse.data.message).contains("Allowance is less than current rate")

                const getStatusResponse = await axios.get(`http://localhost:8081/getStatus?quoteId=${quote.quoteId}`);
                expect(getStatusResponse.data.status).equals(Quote.QUOTE_STATUS_WAITING);
            });

        });

        describe("with approval", function () {
            const timeoutSeconds = 100;
            this.timeout(timeoutSeconds * 1000);

            const abi = [
                'function approve(address, uint256) external returns (bool)',
            ];
            const token = new ethers.Contract("0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889", abi, wallet);

            afterEach("revoke approval", async function () {
                const serverWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
                await (await token.approve(serverWallet.address, ethers.BigNumber.from(0))).wait();
            });

            it("should successfully pull funds from user account", async function() {
                const quoteResponse = await getQuote(wallet);
                const quote = quoteResponse.data;

                await (await token.approve(quote.approveAddress, ethers.constants.MaxInt256)).wait();

                const nonce = Math.floor(new Date().getTime()) / 1000;
                const message = ethers.utils.sha256(ethers.utils.toUtf8Bytes(quote.quoteId + nonce.toString()));
                const signature = await wallet.signMessage(message);
                const uploadResponse = await axios.post(`http://localhost:8081/upload`, {
                    quoteId: quote.quoteId,
                    files: ["ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", "ipfs://QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx"],
                    nonce: nonce,
                    signature: signature,
                });
                expect(uploadResponse.status).equals(200);
                expect(uploadResponse.data).equals('');

                const status = await waitForUpload(timeoutSeconds, quote.quoteId);
                expect(status).equals(Quote.QUOTE_STATUS_UPLOAD_END);
            });

            it("should respond 403 when nonce is old", async function() {
                const timeoutSeconds = 100;
                this.timeout(timeoutSeconds * 1000);

                const getQuoteResponse = await getQuote(wallet).catch((err) => err.response);
                const quote = getQuoteResponse.data;

                await (await token.approve(quote.approveAddress, ethers.constants.MaxInt256)).wait();

                let nonce = Math.floor(new Date().getTime()) / 1000;
                let message = ethers.utils.sha256(ethers.utils.toUtf8Bytes(quote.quoteId + nonce.toString()));
                let signature = await wallet.signMessage(message);
                let uploadResponse = await axios.post(`http://localhost:8081/upload`, {
                    quoteId: quote.quoteId,
                    files: ["ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", "ipfs://QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx"],
                    nonce: nonce,
                    signature: signature,
                }).catch((err) => err.response);

                const status = await waitForUpload(timeoutSeconds, quote.quoteId);
                expect(status).equals(Quote.QUOTE_STATUS_UPLOAD_END);

                // Attempt upload with nonce lower than previous
                nonce = 0;
                message = ethers.utils.sha256(ethers.utils.toUtf8Bytes(quote.quoteId + nonce.toString()));
                signature = await wallet.signMessage(message);
                uploadResponse = await axios.post(`http://localhost:8081/upload`, {
                    quoteId: quote.quoteId,
                    files: ["ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", "ipfs://QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx"],
                    nonce: nonce,
                    signature: signature,
                }).catch((err) => err.response);
                expect(uploadResponse.status).equals(403);
                expect(uploadResponse.data.message).contains("Invalid nonce");
            });

            it("should fail when invalid IPFS URI", async function() {
                const quoteResponse = await getQuote(wallet);
                const quote = quoteResponse.data;

                await (await token.approve(quote.approveAddress, ethers.constants.MaxInt256)).wait();

                const nonce = Math.floor(new Date().getTime()) / 1000;
                const message = ethers.utils.sha256(ethers.utils.toUtf8Bytes(quote.quoteId + nonce.toString()));
                const signature = await wallet.signMessage(message);
                const uploadResponse = await axios.post(`http://localhost:8081/upload`, {
                    quoteId: quote.quoteId,
                    files: ["ipfs://Qmbadbadbadbadbadbadbadbadbadbadbadbadbadbadba", "ipfs://QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx"],
                    nonce: nonce,
                    signature: signature,
                });
                expect(uploadResponse.status).equals(200);
                expect(uploadResponse.data).equals('');

                const status = await waitForUpload(timeoutSeconds, quote.quoteId);
                expect(status).equals(Quote.QUOTE_STATUS_UPLOAD_END);
            });

            it("should upload and get link", async function() {
                const timeoutSeconds = 120;
                this.timeout(timeoutSeconds * 1000);

                const getQuoteResponse = await getQuote(wallet).catch((err) => err.response);
                const quote = getQuoteResponse.data;
                expect(getQuoteResponse.status).equals(200);
                expect(quote).contains.all.keys(
                    "quoteId",
                    "chainId",
                    "tokenAddress",
                    "tokenAmount",
                    "approveAddress"
                );

                await (await token.approve(quote.approveAddress, ethers.constants.MaxInt256)).wait();

                let nonce = Math.floor(new Date().getTime()) / 1000;
                let message = ethers.utils.sha256(ethers.utils.toUtf8Bytes(quote.quoteId + nonce.toString()));
                let signature = await wallet.signMessage(message);
                const uploadResponse = await axios.post(`http://localhost:8081/upload`, {
                    quoteId: quote.quoteId,
                    files: ["ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", "ipfs://QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx"],
                    nonce: nonce,
                    signature: signature,
                }).catch((err) => err.response);
                expect(uploadResponse.status).equals(200);
                expect(uploadResponse.data).equals('');

                const status = await waitForUpload(timeoutSeconds, quote.quoteId);
                expect(status).equals(5);

                nonce = Math.floor(new Date().getTime()) / 1000;
                message = ethers.utils.sha256(ethers.utils.toUtf8Bytes(quote.quoteId + nonce.toString()));
                signature = await wallet.signMessage(message);
                const getLinkResponse = await axios.get(`http://localhost:8081/getLink?quoteId=${quote.quoteId}&nonce=${nonce}&signature=${signature}`);
                expect(getLinkResponse).to.exist;
                expect(getLinkResponse.status).to.equal(200);
                expect(getLinkResponse.data[0]).contains.all.keys(
                    "type",
                    "transactionHash"
                );
            });
        });
    });
});
