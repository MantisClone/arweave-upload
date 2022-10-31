const Bundlr = require("@bundlr-network/client");

const axios = require('axios');
const File = require("../models/upload.model.js");
const Quote = require("../models/quote.model.js");
const Nonce = require("../models/nonce.model.js");
const ethers = require('ethers');
const { acceptToken } = require("./tokens.js");
const { QUOTE_STATUS_PAYMENT_FAILED } = require("../models/quote.model.js");
const { errorResponse } = require("./error.js");

exports.upload = async (req, res) => {
	console.log(`upload request: ${JSON.stringify(req.body)}`)

	// Validate request
	if(!req.body) {
		errorResponse(req, res, 400, "Content can not be empty!");
		return;
	}

	// validate fields
	const quoteId = req.body.quoteId;
	if(typeof quoteId === "undefined") {
		errorResponse(req, res, 400, "Missing quoteId.");
		return;
	}
	if(typeof quoteId !== "string") {
		errorResponse(req, res, 400, "Invalid quoteId.");
		return;
	}

	const files = req.body.files;
	if(typeof files === "undefined") {
		errorResponse(req, res, 400, "Missing files field.");
		return;
	}
	if(typeof files !== "object" || !Array.isArray(files)) {
		errorResponse(req, res, 400, "Invalid files field.");
		return;
	}
	if(files.length == 0) {
		errorResponse(req, res, 400, "Empty files field.");
		return;
	}

	if(files.length > 64) {
		errorResponse(req, res, 400, "Too many files. Max 64.");
		return;
	}

	const cidRegex = /^(Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,})$/i;
	for(let i = 0; i < files.length; i++) {
		if(typeof files[i] !== "string") {
			errorResponse(req, res, 400, `Invalid files field on index ${i}.`);
			return;
		}
		// TODO: validate URL format better
		if(!files[i].startsWith('ipfs://')) {
			errorResponse(req, res, 400, `Invalid files URI on index ${i}. Must be ipfs://<CID>`);
			return;
		}
		if(!cidRegex.test(files[i].substring(7))) {
			errorResponse(req, res, 400, `Invalid files URI on index ${i}. Must be ipfs://<CID>`);
			return;
		}
	}

	const nonce = req.body.nonce;
	if(typeof nonce === "undefined") {
		errorResponse(req, res, 400, "Missing nonce.");
		return;
	}
	if(typeof nonce !== "number") {
		errorResponse(req, res, 400, "Invalid nonce.");
		return;
	}

	const signature = req.body.signature;
	if(typeof signature === "undefined") {
		errorResponse(req, res, 400, "Missing signature.");
		return;
	}
	if(typeof signature !== "string") {
		errorResponse(req, res, 400, "Invalid signature.");
		return;
	}

	// validate quote
	let quote;
	try {
		quote = Quote.get(quoteId);
		if(quote == undefined) {
			errorResponse(req, res, 404, "Quote not found.");
			return;
		}
	}
	catch(err) {
		errorResponse(req, res, 500, "Error occurred while validating quote.");
		return;
	}

	const userAddress = quote.userAddress;
	const message = ethers.utils.sha256(ethers.utils.toUtf8Bytes(quoteId + nonce.toString()));
	let signerAddress;
	try {
		signerAddress = ethers.utils.verifyMessage(message, signature);
	}
	catch(err) {
		errorResponse(req, res, 403, "Invalid signature.");
		return;
	}

	if(signerAddress != userAddress) {
		errorResponse(req, res, 403, "Invalid signature.");
		return;
	}

	let oldNonce;
	try {
		oldNonce = Nonce.get(userAddress)?.nonce || 0.0;
	}
	catch(err) {
		errorResponse(req, res, 500, "Error occurred while validating nonce.");
		return;
	}
	if(parseFloat(nonce) <= parseFloat(oldNonce)) {
		errorResponse(req, res, 403, "Invalid nonce.");
		return;
	}
	try {
		Nonce.set(userAddress, nonce);
	}
	catch(err) {
		errorResponse(req, res, 500, "Error occurred while storing nonce.");
		return;
	}

	// see if token still accepted
	const paymentToken = acceptToken(quote.chainId, quote.tokenAddress);
	if(!paymentToken) {
		errorResponse(req, res, 400, "Payment token no longer accepted.");
		return;
	}

	// check status of quote
	if(quote.status != Quote.QUOTE_STATUS_WAITING) {
		if(quote.status == Quote.QUOTE_STATUS_UPLOAD_END) {
			errorResponse(req, res, 400, "Quote has been completed.");
			return;
		}
		else {
			errorResponse(req, res, 400, "Quote is being processed.");
			return;
		}
	}

	// check if new price is sufficient
	let bundlr;
	try {
		bundlr = new Bundlr.default(process.env.BUNDLR_URI, paymentToken.bundlrName, process.env.PRIVATE_KEY, paymentToken.providerUrl ? {providerUrl: paymentToken.providerUrl, contractAddress: paymentToken.tokenAddress} : {});
	}
	catch(err) {
		errorResponse(req, res, 500, err.message);
		return;
	}

	let bundlrPriceWei;
	let priceWei;
	try {
		bundlrPriceWei = await bundlr.getPrice(quote.size)
		priceWei = ethers.BigNumber.from(bundlrPriceWei.toString(10));
	}
	catch(err) {
		errorResponse(req, res, 500, err.message);
		return;
	}

	const quoteTokenAmount = ethers.BigNumber.from(quote.tokenAmount);

	if(priceWei.gte(quoteTokenAmount)) {
		errorResponse(req, res, 400, `Quoted tokenAmount is less than current rate. Quoted amount: ${quote.tokenAmount}, current rate: ${priceWei}`);
		return;
	}


	// Create provider
	let provider;
	try {
		const acceptedPayments = process.env.ACCEPTED_PAYMENTS.split(",");
		const jsonRpcUris = process.env.JSON_RPC_URIS.split(",");
		const jsonRpcUri = jsonRpcUris[acceptedPayments.indexOf(paymentToken.bundlrName)];
		if(jsonRpcUri === "default") {
			const defaultProviderUrl = paymentToken.providerUrl;
			console.log(`Using "default" provider url (from tokens) = ${defaultProviderUrl}`);
			provider = ethers.getDefaultProvider(defaultProviderUrl);
		}
		else {
			console.log(`Using provider url from JSON_RPC_URIS = ${jsonRpcUri}`);
			provider = ethers.getDefaultProvider(jsonRpcUri);
		}
		console.log(`network = ${JSON.stringify(await provider.getNetwork())}`);
	}
	catch(err) {
		errorResponse(req, res, 500, `Error occurred while establishing connection to Node RPC provider`);
		return;
	}

	// Create wallet
	let wallet;
	try {
		wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
	}
	catch(err) {
		errorResponse(req, res, 500, `Error occurred while creating a Wallet instance.`);
		return;
	}

	// Create payment token contract handle
	let token;
	try {
		const abi = [
			'function transferFrom(address from, address to, uint256 value) external returns (bool)',
			'function allowance(address owner, address spender) external view returns (uint256)',
			'function balanceOf(address owner) external view returns (uint256)',
			'function deposit(uint256 value) external',
			'function withdraw(uint256 value) external',
			'function transfer(address to, uint256 value) external returns (bool)'
		];
		const tokenAddress = paymentToken?.wrappedAddress || paymentToken.tokenAddress ;
		token = new ethers.Contract(tokenAddress, abi, wallet);
		console.log(`payment token address = ${token.address}`);
	}
	catch(err) {
		console.error(err.message);
		errorResponse(req, res, 500, `Error occurred while connecting to payment token contract.`);
		return;
	}

	// Check allowance
	let allowance;
	try {
		allowance = await token.allowance(userAddress, wallet.address);
	}
	catch(err) {
		errorResponse(req, res, 500, `Error occured while checking allowance.`);
		return;
	}
	console.log(`allowance = ${allowance}`);
	if(allowance.lt(priceWei)) {
		errorResponse(req, res, 400, `Allowance is less than current rate. Quoted amount: ${quote.tokenAmount}, current rate: ${priceWei}, allowance: ${allowance}`);
		return;
	}

	// Check that user has sufficient funds
	let userBalance;
	try {
		userBalance = await token.balanceOf(userAddress);
	}
	catch(err) {
		errorResponse(req, res, 500, `Error occurred while checking user token balance.`);
		return;
	}
	console.log(`userBalance = ${userBalance}`);
	if(userBalance.lt(priceWei)) {
		errorResponse(req, res, 400, `User balance is less than current rate. Quoted amount: ${quote.tokenAmount}, current rate: ${priceWei}, userBalance: ${userBalance}`);
		return;
	}

	// Estimate gas costs for full upload process
	let transferFromEstimate;
	let unwrapEstimate;
	let sendEthEstimate
	let wrapEstimate;
	let transferEstimate;
	try {
		// 1. Pull ERC-20 token from userAddress
		transferFromEstimate = await token.estimateGas.transferFrom(userAddress, wallet.address, priceWei);
		// 2. Unwrap if necessary
		unwrapEstimate = await token.estimateGas.withdraw(priceWei);
		// 3. Push funds to Bundlr account
		const bundlrAddressOnMumbai = "0x853758425e953739F5438fd6fd0Efe04A477b039";
		sendEthEstimate = await wallet.estimateGas({to: bundlrAddressOnMumbai, value: priceWei}); // Assume price not dependent on "to" address
		// 4. Possibly refund in case of non-recoverable failure
		wrapEstimate = await token.estimateGas.deposit(priceWei); // Assume price not dependent on amount
		transferEstimate = await token.estimateGas.transfer(userAddress, priceWei); // Assume price not dependent on amount
	}
	catch(err) {
		errorResponse(req, res, 500, `Error occurred while estimating gas costs for upload.`);
		return;
	}

	let gasEstimate = transferFromEstimate.add(sendEthEstimate).add(transferEstimate);
	if(paymentToken.wrappedAddress) {
		gasEstimate = gasEstimate.add(unwrapEstimate).add(wrapEstimate);
	}
	console.log(`gasEstimate = ${gasEstimate}`);

	let feeData;
	try {
		feeData = await provider.getFeeData();
	}
	catch(err) {
		errorResponse(req, res, 500, `Error occurred while getting fee data.`);
		return;
	}
	// Assume all payment chains support EIP-1559 transactions.
	const feeEstimate = gasEstimate.mul(feeData.maxFeePerGas.add(feeData.maxPriorityFeePerGas));
	console.log(`feeEstimate = ${feeEstimate}`);

	// Check server fee token balance
	let feeTokenBalance;
	try {
		feeTokenBalance = await wallet.getBalance();
	}
	catch(err) {
		errorResponse(req, res, 500, `Error occurred while getting server fee token balance.`);
		return;
	}
	console.log(`feeTokenBalance = ${feeTokenBalance}`);
	if(feeEstimate.gte(feeTokenBalance)) {
		errorResponse(req, res, 503, `Estimated fees to process payment exceed fee token reserves. feeEstimate: ${feeEstimate}, feeTokenBalance: ${feeTokenBalance}`);
		return;
	}

	console.log(`${req.path} response: 200`);
	res.send(null); // send 200

	// change status
	try {
		Quote.setStatus(quoteId, Quote.QUOTE_STATUS_PAYMENT_START);
	}
	catch(err) {
		console.error(`Error occurred while setting status to ${Quote.QUOTE_STATUS_PAYMENT_START}`);
		return;
	}

	// Pull payment from user's account using transferFrom(userAddress, amount)
	const confirms = paymentToken.confirms;
	try {
		await (await token.transferFrom(userAddress, wallet.address, priceWei)).wait(confirms);
	}
	catch(err) {
		console.log(err);
		try {
			Quote.setStatus(quoteId, Quote.QUOTE_STATUS_PAYMENT_FAILED);
		}
		catch(err) {
			console.error(`Error occurred while setting status to ${Quote.QUOTE_STATUS_PAYMENT_FAILED}`);
		}
		return;
	}

	// TODO: Set status

	// If payment is wrapped, unwrap it (ex. WETH -> ETH)
	if(paymentToken.wrappedAddress) {
		try {
			await (await token.withdraw(priceWei)).wait(confirms);
		}
		catch(err) {
			console.log(err);
			try {
				Quote.setStatus(quoteId, Quote.QUOTE_STATUS_PAYMENT_FAILED);
			}
			catch(err) {
				console.error(`Error occurred while setting status to ${Quote.QUOTE_STATUS_PAYMENT_FAILED}`);
			}
			return;
		}
	}

	// TODO: Set status

	// TODO: Check Bundlr account balance

	// Fund our EOA's Bundlr Account
	try {
		let response = await bundlr.fund(bundlrPriceWei);
		// TODO: should we record the response values?
		/* {
			id: '0x15d26881006589bd3ac5366ebd5031d8c14a2755d962337fad7216744fe92ed5',
			quantity: '3802172224166296',
			reward: '45832500525000',
			target: '0x853758425e953739F5438fd6fd0Efe04A477b039'
		} */
	}
	catch(err) {
		errorResponse(req, res, 500, "Can't fund the quote.");
		return;
	}

	try {
		Quote.setStatus(quoteId, Quote.QUOTE_STATUS_PAYMENT_END);
		Quote.setStatus(quoteId, Quote.QUOTE_STATUS_UPLOAD_START);
	}
	catch(err) {
		console.error(`Error occurred while setting status to ${Quote.QUOTE_STATUS_UPLOAD_START}`);
		return;
	}

	let files_uploaded = 0;
	await Promise.all(files.map(async (file, index) => {
		let quotedFile;
		try {
			quotedFile = File.get(quoteId, index);
		}
		catch(err) {
			console.log(err);
			return;
		}

		// TODO: get IPFS gateway from config
		const ipfsFile = `https://cloudflare-ipfs.com/ipfs/${file.substring(7)}`;

		// download file
		await axios({
			method: "get",
			url: ipfsFile,
			responseType: "arraybuffer"
		})
		.then(response => {
			// download started
			const contentType = response.headers['content-type'];
			const httpLength = parseInt(response.headers['content-length']);

			if(httpLength) {
				if(httpLength != quotedFile.length) {
					// quoted size is different than real size
					console.log(`Different lengths, quoted length = ${quotedFile.length}, http length ${httpLength}`);
				}
			}

			let tags = [];
			if(contentType) {
				// TODO: sanitize contentType
				tags = [{name: "Content-Type", value: contentType}];
			}

			const uploader = bundlr.uploader.chunkedUploader;

			uploader.setChunkSize(524288);
			uploader.setBatchSize(1);

			uploader.on("chunkUpload", (chunkInfo) => {
				//console.log(`Uploaded Chunk number ${chunkInfo.id}, offset of ${chunkInfo.offset}, size ${chunkInfo.size} Bytes, with a total of ${chunkInfo.totalUploaded} bytes uploaded.`);
			});
			uploader.on("chunkError", (e) => {
				//console.error(`Error uploading chunk number ${e.id} - ${e.res.statusText}`);
			});
			uploader.on("done", async (finishRes) => {
				const transactionId = finishRes.data.id;
				try {
					File.setHash(quoteId, index, transactionId);
				}
				catch(err) {
					console.error(err);
				}

				// perform HEAD request to Arweave Gateway to verify that file uploaded successfully
				try {
					axios.head(`https://arweave.net/${transactionId}`);

					files_uploaded = files_uploaded + 1;
					if(files_uploaded == files.length) {
						try {
							Quote.setStatus(quoteId, Quote.QUOTE_STATUS_UPLOAD_END);
						}
						catch(err) {
							console.error(err);
						}
					}
				}
				catch(err) {
					// transactionId not found
					console.log(`Unable to retreive uploaded file with transaction id ${transactionId}, error: ${err.response.status}`);
				}
			});

			const transactionOptions = {tags: tags};
			try {
				// start upload
				uploader.uploadData(Buffer.from(response.data, "binary"), transactionOptions);
				// TODO: also hash the file
			}
			catch(error) {
				console.log(error.message);
				// TODO: Revisit this status code and consider changing to something unique
				// TODO: Add separate status for insufficient funds, upload fail, etc.
				try {
					Quote.setStatus(quoteId, Quote.QUOTE_STATUS_PAYMENT_FAILED);
				}
				catch(err) {
					console.error(err);
				}
			}
		})
		.catch(error => {
			console.error(error);
		});
	}));
};
