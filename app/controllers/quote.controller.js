const Bundlr = require("@bundlr-network/client");
const crypto = require("crypto");
const ethers = require('ethers');

const Quote = require("../models/quote.model.js");
const Nonce = require("../models/nonce.model.js");
const { acceptToken } = require("./tokens.js");
const { errorResponse } = require("./error.js");

const quoteidRegex = /^[a-fA-F0-9]{32}$/;

exports.create = async (req, res) => {
	console.log(`getQuote endpoint called: ${JSON.stringify(req.body)}`)

	// Validate request
	if(!req.body) {
		errorResponse(res, 400, "Content can not be empty!");
		return;
	}

	// validate fields
	let type = req.body.type;
	if(typeof type === "undefined") {
		errorResponse(res, 400, "Missing type.");
		return;
	}
	if(typeof type !== "string") {
		errorResponse(res, 400, "Invalid type.");
		return;
	}
	if(type != "arweave") {
		errorResponse(res, 400, "Invalid type.");
		return;
	}

	let userAddress = req.body.userAddress;
	if(typeof userAddress === "undefined") {
		errorResponse(res, 400, "Missing userAddress.");
		return;
	}
	if(typeof userAddress !== "string") {
		errorResponse(res, 400, "Invalid userAddress.");
		return;
	}
	if(!ethers.utils.isAddress(userAddress)) {
		errorResponse(res, 400, "Invalid userAddress.");
	}

	let files = req.body.files;
	if(typeof files === "undefined") {
		errorResponse(res, 400, "Missing files field.");
		return;
	}
	if(typeof files !== "object" || !Array.isArray(files)) {
		errorResponse(res, 400, "Invalid files field.");
		return;
	}
	if(files.length == 0) {
		errorResponse(res, 400, "Empty files field.");
		return;
	}

	if(files.length > 64) {
		errorResponse(res, 400, "Too many files. Max 64.");
		return;
	}

	let totalLength = 0;
	let file_lengths = [];
	for(let i = 0; i < files.length; i++) {
		if(typeof files[i] !== "object") {
			errorResponse(res, 400, "Invalid files field.");
			return;
		}
		if(!files[i].hasOwnProperty("length")) {
			errorResponse(res, 400, "Invalid files field.");
			return;
		}
		else {
			file_length = files[i].length;
			if(isNaN(file_length) || (typeof file_length !== "number" && typeof(file_length) !== "string") || (typeof file_length === "string" && file_length.trim() === "")) {
				errorResponse(res, 400, "Invalid files length.");
				return;
			}
			file_length = parseInt(file_length);

			if(file_length <= 0) {
				errorResponse(res, 400, "Files length too small.");
				return;
			}
			if(file_length > 1024 ** 4) { // TODO: replce with max upload
				errorResponse(res, 400, "Individual files may not exceed 1 TB");
				return;
			}
		}
		totalLength = totalLength + file_length
		file_lengths.push(file_length);
	}

	if(totalLength <= 0 || totalLength > 1024 ** 4) { // TODO: replace with max upload
		errorResponse(res, 400, "Total file length may not exceed 1 TB");
		return;
	}

	let payment = req.body.payment;
	if(typeof payment === "undefined") {
		errorResponse(res, 400, "Missing payment field.");
		return;
	}
	if(typeof payment !== "object") {
		errorResponse(res, 400, "Invalid payment field.");
		return;
	}

	if(!payment.hasOwnProperty("chainId")) {
		errorResponse(res, 400, "Missing chainId field.");
		return;
	}
	let chainId = payment.chainId;
	if(isNaN(chainId) || (typeof chainId !== "number" && typeof(chainId) !== "string") || (typeof chainId === "string" && chainId.trim() === "")) {
		errorResponse(res, 400, "Invalid chainId.");
		return;
	}

	chainId = parseInt(chainId);
	if(chainId <= 0) {
		errorResponse(res, 400, "chainId too small.");
		return;
	}

	if(!payment.hasOwnProperty("tokenAddress")) {
		errorResponse(res, 400, "Missing tokenAddress field.");
		return;
	}
	let tokenAddress = payment.tokenAddress;
	if(typeof tokenAddress !== "string") {
		errorResponse(res, 400, "Invalid tokenAddress.");
		return;
	}
	if(!ethers.utils.isAddress(tokenAddress)) {
		errorResponse(res, 400, "Invalid tokenAddress format.");
		return;
	}

	const paymentToken = acceptToken(chainId, tokenAddress);
	if(!paymentToken) {
		errorResponse(res, 400, "Payment token not accepted.");
		return;
	}

	let bundlr;
	try {
		bundlr = new Bundlr.default(process.env.BUNDLR_URI, paymentToken.bundlrName, process.env.PRIVATE_KEY, paymentToken.providerUrl ? {providerUrl: paymentToken.providerUrl, contractAddress: paymentToken.tokenAddress} : {});
	}
	catch(err) {
		errorResponse(res, 500, err.message);
		return;
	}

	let priceWei;
	try {
		priceWei = await bundlr.getPrice(totalLength);
		priceWei = ethers.BigNumber.from(priceWei.toString()); // need to convert so we can add buffer
	}
	catch(err) {
		errorResponse(res, 500, err.message);
		return;
	}
	const tokenAmount = priceWei.add(priceWei.div(10)); // add 10% buffer since prices fluctuate

	// TODO: generate this better
	const quoteId = crypto.randomBytes(16).toString("hex");

	// save data in database
	const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
	const quote = new Quote({
		quoteId: quoteId,
		status: Quote.QUOTE_STATUS_WAITING,
		created: Date.now(),
		chainId: chainId,
		tokenAddress: tokenAddress,
		userAddress: userAddress,
		tokenAmount: tokenAmount.toString(),
		approveAddress: wallet.address,
		files: file_lengths

	});

	// Save Reading in the database
	await Quote.create(quote, (err, data) => {
		if(err) {
			errorResponse(res, 500, err.message || "Error occurred while creating the quote.");
			return;
		}
		else {
			// send receipt for data
			res.send(data);
		}
	});
};

exports.getStatus = async (req, res) => {
	console.log(`getStatus endpoint called: ${JSON.stringify(req.query)}`)

	if(!req.query || !req.query.quoteId) {
		errorResponse(res, 400, "Error, quoteId required.");
		return;
	}
	const quoteId = req.query.quoteId;

	if(!quoteidRegex.test(quoteId)) {
		errorResponse(res, 400, "Invalid quoteId format.");
		return;
	}

	await Quote.getStatus(quoteId, (err, data) => {
		if(err) {
			if(err.code == 404) {
				errorResponse(res, 404, 0);
				return;
			}
			errorResponse(res, 500, err.message || "Error occurred while looking up status.");
		}
		else {
			// send receipt for data
			res.send(data);
		}
	});
};

exports.setStatus = async (quoteId, status) => {
	await Quote.setStatus(quoteId, status, (err, data) => {
		if(err) {
			console.log(err);
		}
	});
};

exports.getLink = async (req, res) => {
	console.log(`getLink endpoint called: ${JSON.stringify(req.query)}`)

	if(!req.query || !req.query.quoteId) {
		errorResponse(res, 400, "Error, quoteId required.");
		return;
	}
	const quoteId = req.query.quoteId;

	if(!quoteidRegex.test(quoteId)) {
		errorResponse(res, 400, "Invalid quoteId format.");
		return;
	}

	const nonce = req.query.nonce;
	if(typeof nonce === "undefined") {
		errorResponse(res, 400, "Missing nonce.");
		return;
	}
	if(typeof nonce !== "string") {
		errorResponse(res, 400, "Invalid nonce.");
		return;
	}

	const signature = req.query.signature;
	if(typeof signature === "undefined") {
		errorResponse(res, 400, "Missing signature.");
		return;
	}
	if(typeof signature !== "string") {
		errorResponse(res, 400, "Invalid signature format.");
		return;
	}

	// get userAddress
	await Quote.get(quoteId, (err, data) => {
		if(err) {
			if(err.code == 404) {
				errorResponse(res, 404, err.message);
				return;
			}
			errorResponse(res, 500, err.message || "Error occurred while looking up userAddress.");
			return;
		}
		const userAddress = data.userAddress;
		const message = ethers.utils.sha256(ethers.utils.toUtf8Bytes(quoteId + nonce.toString()));
		let signerAddress;
		try {
			signerAddress = ethers.utils.verifyMessage(message, signature);
		}
		catch(err) {
			errorResponse(res, 403, "Invalid signature.");
			return;
		}

		if(signerAddress != userAddress) {
			errorResponse(res, 403, "Invalid signature.");
			return;
		}

		Nonce.get(userAddress, async (err, data) => {
			if(err) {
				errorResponse(res, 500, err.message || "Error occurred while validating nonce.");
				return;
			}
			if(data) {
				const old_nonce = data.nonce;
				if(parseFloat(nonce) <= parseFloat(old_nonce)) {
					errorResponse(res, 403, "Invalid nonce.");
					return;
				}
			}
			Nonce.set(userAddress, nonce);

			await Quote.getLink(quoteId, (err, data) => {
				if(err) {
					if(err.code == 404) {
						errorResponse(res, 404, err.message);
						return;
					}
					errorResponse(res, 500, err.message || "Error occurred while looking up link.");
					return;
				}
				// send receipt for data
				res.send(data);
			});
		});
	});
};
