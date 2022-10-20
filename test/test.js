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
                files: [{length: 1256}, {length: 5969}],
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
                files: [{length: 1256}, {length: 5969}],
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
                files: ["https://example.com/", "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png"],
                nonce: nonce,
                signature: signature,
            });

            expect(uploadResponse.status).to.be.equal(200);
        });
    });

});
