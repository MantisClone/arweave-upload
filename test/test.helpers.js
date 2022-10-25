const axios = require("axios");

exports.getQuote = async (wallet) => {
    return axios.post(`http://localhost:8081/getQuote`, {
        type: "arweave",
        userAddress: wallet.address,
        files: [{length: 119762}, {length: 13}],
        payment: {
            chainId: 80001,
            tokenAddress: "0x0000000000000000000000000000000000001010",
        },
    });
}
