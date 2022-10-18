const Bundlr = require("@bundlr-network/client");
const crypto = require("crypto");
const ethers = require('ethers');

const Quote = require("../models/quote.model.js");
const { acceptToken } = require("./tokens.js");

exports.create = async (req, res) => {
	const addressRegex = /^0x[a-fA-F0-9]{40}$/;
	// TODO: when checking addresses, also check checksum

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

	if(!addressRegex.test(userAddress)) {
		res.status(400).send({
			message: "Invalid userAddress format."
		});
		return;
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
		if(files[i].hasOwnProperty("length")) {
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
	if(!addressRegex.test(tokenAddress)) {
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
		bundlr = new Bundlr.default(process.env.BUNDLR_URI, paymentToken.name, process.env.PRIVATE_KEY, paymentToken.providerUrl ? {providerUrl: paymentToken.providerUrl, contractAddress: paymentToken.tokenAddress} : {});
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
		priceWei = ethers.BigNumber.from(priceWei.toString()); // need to convert so we can add buffer
	}
	catch(err) {
		res.status(500).send({
			message: err.message
		});
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
	Quote.create(quote, (err, data) => {
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

exports.status = async (req, res) => {
	const quoteidRegex = /^[a-fA-F0-9]{32}$/;

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

	Quote.getStatus(quoteId, (err, data) => {
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
	Quote.setStatus(quoteId, status, (err, data) => {
		if(err) {
			console.log(err);
		}
	});
};