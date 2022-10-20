const ethers = require("ethers");
const axios = require("axios");
const { use, expect } = require("chai");

describe("DBS Arweave Upload", () => {
    const wallet = new ethers.Wallet(process.env.TEST_PRIVATE_KEY);
    console.log("Alice address: " + wallet.address);
    describe("getQuote", () => {
        it("Should return quote ID", async () => {
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
});
