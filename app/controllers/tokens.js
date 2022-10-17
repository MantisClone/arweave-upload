acceptToken = (chainId, tokenAddress) => {
	const tokens = [
		{name: "ethereum", chainId: 1, tokenAddress: "0x0000000000000000000000000000000000000000"},
		{name: "matic", chainId: 137, tokenAddress: "0x0000000000000000000000000000000000000000"},
		{name: "bnb", chainId: 56, tokenAddress: "0x0000000000000000000000000000000000000000"},
		{name: "arbitrum", chainId: 42161, tokenAddress: "0x0000000000000000000000000000000000000000"},
		{name: "avalanche", chainId: 43114, tokenAddress: "0x0000000000000000000000000000000000000000"},
		{name: "boba", chainId: 288, tokenAddress: "0xa18bF3994C0Cc6E3b63ac420308E5383f53120D7"},
		{name: "boba-eth", chainId: 288, tokenAddress: "0x0000000000000000000000000000000000000000"},

		{name: "matic", chainId: 80001, tokenAddress: "0x0000000000000000000000000000000000001010", providerUrl: "https://rpc-mumbai.matic.today"}
	];

	const accepted = process.env.ACCEPTED_PAYMENTS.split(",");

	for(let i = 0; i < tokens.length; i++) {
		if(accepted.includes(tokens[i].name)) {
			if(tokens[i].chainId == chainId && tokens[i].tokenAddress == tokenAddress) {
				return tokens[i];
			}
		}
	}
	return false;
};

module.exports = acceptToken;