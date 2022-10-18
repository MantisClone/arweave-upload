const tokens =[
	{name: "ethereum", chainId: 1, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "ETH"},
	{name: "matic", chainId: 137, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "MATIC"},
	{name: "bnb", chainId: 56, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "BNB"},
	{name: "arbitrum", chainId: 42161, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "ETH"},
	{name: "avalanche", chainId: 43114, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "AVAX"},
	{name: "boba", chainId: 288, tokenAddress: "0xa18bF3994C0Cc6E3b63ac420308E5383f53120D7", symbol: "ETH"},
	{name: "boba-eth", chainId: 288, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "BOBA"},

	{name: "matic", chainId: 80001, tokenAddress: "0x0000000000000000000000000000000000001010", providerUrl: "https://rpc-mumbai.maticvigil.com/"}
];

acceptToken = (chainId, tokenAddress) => {
	const accepted = process.env.ACCEPTED_PAYMENTS.split(",");

	let acceptToken = false;
	tokens.forEach((token) => {
		if(accepted.includes(token.name)) {
			if(token.chainId == chainId && token.tokenAddress == tokenAddress) {
				acceptToken = token;
				return;
			}
		}
	});

	return acceptToken;
};

/**
 * Get a list of supported payment options in the format expected by /register
 */
getAcceptedPaymentDetails = () => {
	const acceptedPayments = process.env.ACCEPTED_PAYMENTS.split(",");
	const acceptedDetails = tokens.filter((token) => acceptedPayments.includes(token.name));
	const compressedDetails = [];
	acceptedDetails.forEach((detail) => {
		let added = false;
		const acceptedToken = {};
		acceptedToken[detail.symbol] = detail.tokenAddress;
		compressedDetails.forEach((compressedDetail) => {
			if(detail.chainId == compressedDetail.chainId) {
				compressedDetail.acceptedTokens.push(acceptedToken);
				added = true;
			}
		})
		if(!added) {
			compressedDetails.push({
				"chainId": detail.chainId,
				"acceptedTokens": [acceptedToken]
			})
		}
	})
	return compressedDetails;
};

module.exports = { acceptToken, getAcceptedPaymentDetails };
