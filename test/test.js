const ethers = require("ethers");
const axios = require("axios");
const { use, expect } = require("chai");

describe("DBS Arweave Upload", () => {
    const wallet = new ethers.Wallet(process.env.TEST_PRIVATE_KEY);
    console.log("Alice address: " + wallet.address);
    describe("getQuote", () => {
        it("should return quote ID", async () => {
            const response = await axios.post(`http://localhost:8081/getQuote`, {
                type: "arweave",
                userAddress: wallet.address,
                files: [{length: 119762}, {length: 13}],
                payment: {
                    chainId: 80001,
                    tokenAddress: "0x0000000000000000000000000000000000001010",
                },
            });
            console.log(`quote = ${JSON.stringify(response.data)}`);
        });
    });

    describe("upload", () => {

        it("should pull funds from user account.", async () => {
            const quoteResponse = await axios.post(`http://localhost:8081/getQuote`, {
                type: "arweave",
                userAddress: wallet.address,
                files: [{length: 119762}, {length: 13}],
                payment: {
                    chainId: 80001,
                    tokenAddress: "0x0000000000000000000000000000000000001010",
                },
            });
            const quote = quoteResponse.data;

            nonce = Math.floor(new Date().getTime()) / 1000;
            message = ethers.utils.sha256(ethers.utils.toUtf8Bytes(quote.quoteId + nonce.toString()));
            signature = await wallet.signMessage(message);

            const uploadResponse = await axios.post(`http://localhost:8081/upload`, {
                quoteId: quote.quoteId,
                files: ["ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", "ipfs://QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx"],
                nonce: nonce,
                signature: signature,
            });

            expect(uploadResponse.status).to.be.equal(200);

            // getStatus
            let status
            for(let i = 0; i < 15; i++) {
                let getStatusResponse = await axios.get(`http://localhost:8081/getStatus?quoteId=${quote.quoteId}`);
                status = getStatusResponse.data.status;
                if(status === 5) break;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log("Hello world");
            expect(true).to.be.equal(false);
            expect(status).to.be.equal(5);
        });
    });

});
