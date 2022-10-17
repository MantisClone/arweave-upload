const tokens2 = {
	ethereum: {
		chainId: 1,
		acceptedTokens: [
			{ETH: "0x0000000000000000000000000000000000000000"}
		]
	},
	matic: {
		chainId: 137,
		acceptedTokens: [
			{MATIC: "0x0000000000000000000000000000000000000000"}
		]
	},
	bnb: {
		chainId: 56, 
		acceptedTokens: [
			{BNB: "0x0000000000000000000000000000000000000000"},
		]
	},
	arbitrum: {
		chainId: 42161,
		acceptedTokens: [
			{ETH: "0x0000000000000000000000000000000000000000"},
		]
	},
	avalanche: {
		chainId: 43114,
		acceptedTokens: [
			{AVAX: "0x0000000000000000000000000000000000000000"},
		]
	},
	boba: {
		chainId: 288, 
		acceptedTokens: [
			{BOBA: "0xa18bF3994C0Cc6E3b63ac420308E5383f53120D7"},
		]
	},
	"boba-eth": {
		chainId: 288, 
		acceptedTokens: [
			{ETH: "0x0000000000000000000000000000000000000000"},
		]
	}
};

const tokens =[
	{name: "ethereum", chainId: 1, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "ETH"},
	{name: "matic", chainId: 137, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "MATIC"},
	{name: "bnb", chainId: 56, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "BNB"},
	{name: "arbitrum", chainId: 42161, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "ETH"},
	{name: "avalanche", chainId: 43114, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "AVAX"},
	{name: "boba", chainId: 288, tokenAddress: "0xa18bF3994C0Cc6E3b63ac420308E5383f53120D7", symbol: "ETH"},
	{name: "boba-eth", chainId: 288, tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "BOBA"}
];

acceptToken = (chainId, tokenAddress) => {
	const accepted = process.env.ACCEPTED_PAYMENTS.split(",");

	for(let i = 0; i < tokens.length; i++) {
		if(accepted.includes(tokens[i].name)) {
			if(tokens[i].chainId == chainId && tokens[i].tokenAddress == tokenAddress) {
				return tokens[i].name;
			}
		}
	}
	return false;
};

getAcceptedPaymentDetails = () => {
	const acceptedPayments = process.env.ACCEPTED_PAYMENTS.split(",");
	console.log(`acceptedPayments = ${acceptedPayments}`);
	const acceptedDetails = tokens.filter((token) => acceptedPayments.includes(token.name));
	console.log(`acceptedDetails = ${JSON.stringify(acceptedDetails)}`);
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
}

module.exports = { acceptToken, getAcceptedPaymentDetails };
