const Bundlr = require("@bundlr-network/client");
const crypto = require("crypto");
const ethers = require('ethers');
const BigNumber = require("bignumber.js");

const Quote = require("../models/quote.model.js");
const Nonce = require("../models/nonce.model.js");
const { acceptToken } = require("./tokens.js");

const quoteidRegex = /^[a-fA-F0-9]{32}$/;

exports.create = async (req, res) => {
	console.log(`getQuote endpoint called: ${JSON.stringify(req.body)}`)

	// Validate request
	if(!req.body) {
		res.status(400).send({
			message: "Content can not be empty!"
		});
		return;
	}

	// validate fields
	let type = req.body.type;
	if(typeof type === "undefined") {
		res.status(400).send({
			message: "Missing type."
		});
		return;
	}
	if(typeof type !== "string") {
		res.status(400).send({
			message: "Invalid type."
		});
		return;
	}
	if(type != "arweave") {
		res.status(400).send({
			message: "Invalid type."
		});
		return;
	}

	let userAddress = req.body.userAddress;
	if(typeof userAddress === "undefined") {
		res.status(400).send({
			message: "Missing userAddress."
		});
		return;
	}
	if(typeof userAddress !== "string") {
		res.status(400).send({
			message: "Invalid userAddress."
		});
		return;
	}
	if(!ethers.utils.isAddress(userAddress)) {
		res.status(400).send({
			message: "Invalid userAddress."
		})
	}

	let files = req.body.files;
	if(typeof files === "undefined") {
		res.status(400).send({
			message: "Missing files field."
		});
		return;
	}
	if(typeof files !== "object" || !Array.isArray(files)) {
		res.status(400).send({
			message: "Invalid files field."
		});
		return;
	}
	if(files.length == 0) {
		res.status(400).send({
			message: "Empty files field."
		});
		return;
	}

	if(files.length > 64) {
		res.status(400).send({
			message: "Too many files. Max 64."
		});
		return;
	}

	let totalLength = 0;
	let file_lengths = [];
	for(let i = 0; i < files.length; i++) {
		if(typeof files[i] !== "object") {
			res.status(400).send({
				message: "Invalid files field."
			});
			return;
		}
		if(!files[i].hasOwnProperty("length")) {
			res.status(400).send({
				message: "Invalid files field."
			});
			return;
		}
		else {
			file_length = files[i].length;
			if(isNaN(file_length) || (typeof file_length !== "number" && typeof(file_length) !== "string") || (typeof file_length === "string" && file_length.trim() === "")) {
				res.status(400).send({
					message: "Invalid files length."
				});
				return;
			}
			file_length = parseInt(file_length);

			if(file_length <= 0) {
				res.status(400).send({
					message: "Files length too small."
				});
				return;
			}
			if(file_length > 1024 ** 4) { // TODO: replce with max upload
				res.status(400).send({
					message: "Individual files may not exceed 1 TB"
				});
				return;
			}
		}
		totalLength = totalLength + file_length
		file_lengths.push(file_length);
	}

	if(totalLength <= 0 || totalLength > 1024 ** 4) { // TODO: replace with max upload
		res.status(400).send({
			message: "Total file length may not exceed 1 TB"
		});
		return;
	}

	let payment = req.body.payment;
	if(typeof payment === "undefined") {
		res.status(400).send({
			message: "Missing payment field."
		});
		return;
	}
	if(typeof payment !== "object") {
		res.status(400).send({
			message: "Invalid payment field."
		});
		return;
	}

	if(!payment.hasOwnProperty("chainId")) {
		res.status(400).send({
			message: "Missing chainId field."
		});
		return;
	}
	let chainId = payment.chainId;
	if(isNaN(chainId) || (typeof chainId !== "number" && typeof(chainId) !== "string") || (typeof chainId === "string" && chainId.trim() === "")) {
		res.status(400).send({
			message: "Invalid chainId."
		});
		return;
	}

	chainId = parseInt(chainId);
	if(chainId <= 0) {
		res.status(400).send({
			message: "chainId too small."
		});
		return;
	}

	if(!payment.hasOwnProperty("tokenAddress")) {
		res.status(400).send({
			message: "Missing tokenAddress field."
		});
		return;
	}
	let tokenAddress = payment.tokenAddress;
	if(typeof tokenAddress !== "string") {
		res.status(400).send({
			message: "Invalid tokenAddress."
		});
		return;
	}
	if(!ethers.utils.isAddress(tokenAddress)) {
		res.status(400).send({
			message: "Invalid tokenAddress format."
		});
		return;
	}

	const paymentToken = acceptToken(chainId, tokenAddress);
	if(!paymentToken) {
		res.status(400).send({
			message: "Payment token not accepted."
		});
		return;
	}

	let bundlr;
	try {
		bundlr = new Bundlr.default(process.env.BUNDLR_URI, paymentToken.bundlrName, process.env.PRIVATE_KEY, paymentToken.providerUrl ? {providerUrl: paymentToken.providerUrl, contractAddress: paymentToken.tokenAddress} : {});
	}
	catch(err) {
		res.status(500).send({
			message: err.message
		});
		return;
	}

	let priceWei;
	try {
		priceWei = await bundlr.getPrice(totalLength);
	}
	catch(err) {
		res.status(500).send({
			message: err.message
		});
		return;
	}

	// convert bignumber.js BigNumber to ethers.BigNumber
	let ethersPriceWei;
	const strPriceWei = priceWei.toString();
	console.log(`strPriceWei = ${STRpRICEwEI}`);
	if(!strPriceWei.match(/^\d+$/)) {
		BigNumber.config({ EXPONENTIAL_AT: 1e+9 });
		const big = new BigNumber(0).plus(priceWei);
		ethersPriceWei = ethers.BigNumber.from(big.toString());
	}
	else {
		ethersPriceWei = ethers.BigNumber.from(strPriceWei);
	}

	// add 10% buffer since prices fluctuate
	const tokenAmount = ethersPriceWei.add(ethersPriceWei.div(10));

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
			res.status(500).send({
				message:
					err.message || "Error occurred while creating the quote."
			});
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
		res.status(400).send({
			message: "Error, quoteId required."
		});
		return;
	}
	const quoteId = req.query.quoteId;

	if(!quoteidRegex.test(quoteId)) {
		res.status(400).send({
			message: "Invalid quoteId format."
		});
		return;
	}

	await Quote.getStatus(quoteId, (err, data) => {
		if(err) {
			if(err.code == 404) {
				res.status(404).send({
					status: 0
				});
				return;
			}
			res.status(500).send({
				message:
					err.message || "Error occurred while looking up status."
			});
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
		res.status(400).send({
			message: "Error, quoteId required."
		});
		return;
	}
	const quoteId = req.query.quoteId;

	if(!quoteidRegex.test(quoteId)) {
		res.status(400).send({
			message: "Invalid quoteId format."
		});
		return;
	}

	const nonce = req.query.nonce;
	if(typeof nonce === "undefined") {
		res.status(400).send({
			message: "Missing nonce."
		});
		return;
	}
	if(typeof nonce !== "string") {
		res.status(400).send({
			message: "Invalid nonce."
		});
		return;
	}

	const signature = req.query.signature;
	if(typeof signature === "undefined") {
		res.status(400).send({
			message: "Missing signature."
		});
		return;
	}
	if(typeof signature !== "string") {
		res.status(400).send({
			message: "Invalid signature format."
		});
		return;
	}

	// get userAddress
	await Quote.get(quoteId, (err, data) => {
		if(err) {
			if(err.code == 404) {
				res.status(404).send({
					message: err.message
				});
				return;
			}
			res.status(500).send({
				message:
					err.message || "Error occurred while looking up userAddress."
			});
			return;
		}
		const userAddress = data.userAddress;
		const message = ethers.utils.sha256(ethers.utils.toUtf8Bytes(quoteId + nonce.toString()));
		let signerAddress;
		try {
			signerAddress = ethers.utils.verifyMessage(message, signature);
		}
		catch(err) {
			res.status(403).send({
				message: "Invalid signature."
			});
			return;
		}

		if(signerAddress != userAddress) {
			res.status(403).send({
				message: "Invalid signature."
			});
			return;
		}

		Nonce.get(userAddress, async (err, data) => {
			if(err) {
				res.status(500).send({
					message:
						err.message || "Error occurred while validating nonce."
				});
				return;
			}
			if(data) {
				const old_nonce = data.nonce;
				if(parseFloat(nonce) <= parseFloat(old_nonce)) {
					res.status(403).send({
						message: "Invalid nonce."
					});
					return;
				}
			}
			Nonce.set(userAddress, nonce);

			await Quote.getLink(quoteId, (err, data) => {
				if(err) {
					if(err.code == 404) {
						res.status(404).send({
							message: err.message
						});
						return;
					}
					res.status(500).send({
						message:
							err.message || "Error occurred while looking up link."
					});
					return;
				}
				// send receipt for data
				res.send(data);
			});
		});
	});
};
