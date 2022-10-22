const tokens =[
	// Mainnets, used with public Bundlr URIs. See for details https://docs.bundlr.network/docs/bundlers
	{bundlrName: "ethereum", chainId: 1, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "ETH", providerUrl: "https://cloudflare-eth.com/", wrappedAddress: "TODO", confirms: 1},
	{bundlrName: "matic", chainId: 137, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "MATIC", providerUrl: "https://polygon-rpc.com", wrappedAddress: "TODO", confirms: 30},
	{bundlrName: "bnb", chainId: 56, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "BNB", providerUrl: "https://bsc-dataseed.binance.org", wrappedAddress: "TODO", confirms: 1},
	{bundlrName: "arbitrum", chainId: 42161, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "ETH", providerUrl: "https://arb1.arbitrum.io/rpc", wrappedAddress: "TODO", confirms: 1},
	{bundlrName: "avalanche", chainId: 43114, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "AVAX", providerUrl: "https://api.avax.network/ext/bc/C/rpc", wrappedAddress: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", confirms: 1},
	{bundlrName: "boba", chainId: 288, tokenAddress: "0xa18bF3994C0Cc6E3b63ac420308E5383f53120D7", symbol: "ETH", providerUrl: "https://mainnet.boba.network/", confirms: 1},
	{bundlrName: "boba-eth", chainId: 288, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "BOBA", providerUrl: "https://mainnet.boba.network/", wrappedAddress: "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000", confirms: 1},
	// Testnets, used with devnet Bundlr URI. See for details: https://docs.bundlr.network/docs/devnet
	{bundlrName: "matic", chainId: 80001, tokenAddress: "0x0000000000000000000000000000000000001010", symbol: "MATIC", providerUrl: "https://rpc-mumbai.maticvigil.com/", wrappedAddress: "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889", confirms: 1}
];

acceptToken = (chainId, tokenAddress) => {
	const accepted = process.env.ACCEPTED_PAYMENTS.split(",");

	let acceptToken = false;
	tokens.forEach((token) => {
		if(accepted.includes(token.bundlrName)) {
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
	const acceptedDetails = tokens.filter((token) => acceptedPayments.includes(token.bundlrName));
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
