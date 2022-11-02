const axios = require("axios");

exports.getQuote = async (wallet, size = 119762) => {
    return axios.post(`http://localhost:8081/getQuote`, {
        type: "arweave",
        userAddress: wallet.address,
        files: [{length: size}, {length: 13}],
        payment: {
            chainId: 80001,
            tokenAddress: "0x0000000000000000000000000000000000001010",
        },
    });
}

exports.waitForUpload = async (timeoutSeconds, quoteId) => {
    let status;
    for(let i = 0; i < timeoutSeconds; i++) {
        const getStatusResponse = await axios.get(`http://localhost:8081/getStatus?quoteId=${quoteId}`);
        status = getStatusResponse.data.status;
        if(status >= 5) break;
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    return status;
};
