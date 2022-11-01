const axios = require("axios");
const Quote = require("../app/models/quote.model");

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

exports.isUploadFinishedOrFailed = (status) => {
    return (
        (status >= Quote.QUOTE_STATUS_PAYMENT_PULL_FAILED
            && status < Quote.QUOTE_STATUS_UPLOAD_START)
        || status >= Quote.QUOTE_STATUS_UPLOAD_END
    )
}

exports.waitForUpload = async (timeoutSeconds, quoteId) => {
    let status;
    for(let i = 0; i < timeoutSeconds; i++) {
        const getStatusResponse = await axios.get(`http://localhost:8081/getStatus?quoteId=${quoteId}`);
        status = getStatusResponse.data.status;
        // if 200 - 299 or 400 - 499
        if(isUploadFinishedOrFailed(status)) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return status;
};
