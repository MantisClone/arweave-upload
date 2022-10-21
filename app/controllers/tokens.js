const tokens =[
	// Mainnets, used with public Bundlr URIs. See for details https://docs.bundlr.network/docs/bundlers
	{name: "ethereum", chainId: 1, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "ETH", providerUrl: "https://cloudflare-eth.com/"},
	{name: "matic", chainId: 137, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "MATIC", providerUrl: "https://polygon-rpc.com", confirms: 30},
	{name: "bnb", chainId: 56, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "BNB", providerUrl: "https://bsc-dataseed.binance.org"},
	{name: "arbitrum", chainId: 42161, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "ETH", providerUrl: "https://arb1.arbitrum.io/rpc"},
	{name: "avalanche", chainId: 43114, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "AVAX", providerUrl: "https://api.avax.network/ext/bc/C/rpc"},
	{name: "boba", chainId: 288, tokenAddress: "0xa18bF3994C0Cc6E3b63ac420308E5383f53120D7", symbol: "ETH", providerUrl: "https://mainnet.boba.network/"},
	{name: "boba-eth", chainId: 288, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "BOBA", providerUrl: "https://mainnet.boba.network/"},
	// Testnets, used with devnet Bundlr URI. See for details: https://docs.bundlr.network/docs/devnet
	{name: "matic", chainId: 80001, tokenAddress: "0x0000000000000000000000000000000000001010", symbol: "MATIC", providerUrl: "https://rpc-mumbai.maticvigil.com/", wrappedAddress: "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889", confirms: 1}
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
