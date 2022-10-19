const ethers = require('ethers');
const axios = require('axios');

async function test() {
	let quote, nonce, message, signature;

	const wallet = new ethers.Wallet(process.env.TEST_PRIVATE_KEY);
	console.log("Address: " + wallet.address);

	// getQuote
	await axios.post(`http://localhost:8081/getQuote`, {
		type: "arweave",
		userAddress: wallet.address,
		files: [{length: 1256}, {length: 5969}],
		payment: {
			chainId: 80001,
			tokenAddress: "0x0000000000000000000000000000000000001010",
		},
	})
	.then((response) => {
		quote = response.data;
		console.log(`Got quote with id: ${quote.quoteId}`);
	})
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});

	// upload
	nonce = Math.floor(new Date().getTime()) / 1000;
	message = ethers.utils.sha256(ethers.utils.toUtf8Bytes(quote.quoteId + nonce.toString()));
	signature = await wallet.signMessage(message);

	await axios.post(`http://localhost:8081/upload`, {
		quoteId: quote.quoteId,
		files: ["https://example.com/", "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png"],
		nonce: nonce,
		signature: signature,
	})
	.then((response) => {
		console.log("Upload started");
	})
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})

	// getStatus
	for(let i = 0; i < 60; i++) {
		let status
		await axios.get(`http://localhost:8081/getStatus?quoteId=${quote.quoteId}`)
		.then((response) => {
			console.log(response.data);
			status = response.data.status;
		})
		.catch((error) => {
			console.error(error);
		});
		if(status == 5) break;
		await new Promise(resolve => setTimeout(resolve, 1000));
	}

	// getLink
	nonce = Math.floor(new Date().getTime()) / 1000;
	message = ethers.utils.sha256(ethers.utils.toUtf8Bytes(quote.quoteId + nonce.toString()));
	signature = await wallet.signMessage(message);

	await axios.get(`http://localhost:8081/getLink?quoteId=${quote.quoteId}&nonce=${nonce}&signature=${signature}`)
	.then((response) => {
		console.log("getLink:");
		console.log(response.data);
	})
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
}

(async() => {
	await test();
})();
