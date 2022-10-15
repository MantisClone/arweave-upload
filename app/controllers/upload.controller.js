const Bundlr = require("@bundlr-network/client");

//const Upload = require("../models/upload.model.js");
const Quote = require("../models/quote.model.js");
const acceptToken = require("./tokens.js");

exports.upload = async (req, res) => {
	// Validate request
	if(!req.body) {
		res.status(400).send({
			message: "Content can not be empty!"
		});
		return;
	}

	// validate fields
	let quoteId = req.body.quoteId;
	if(typeof quoteId === "undefined") {
		res.status(400).send({
			message: "Missing quoteId."
		});
		return;
	}
	if(typeof quoteId !== "string") {
		res.status(400).send({
			message: "Invalid quoteId."
		});
		return;
	}

	let nonce = req.body.nonce;
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

	let signature = req.body.signature;
	if(typeof signature === "undefined") {
		res.status(400).send({
			message: "Missing signature."
		});
		return;
	}
	if(typeof signature !== "string") {
		res.status(400).send({
			message: "Invalid signature."
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

	for(let i = 0; i < files.length; i++) {
		if(typeof files[i] !== "string") {
			res.status(400).send({
				message: "Invalid files field."
			});
			return;
		}
		// TODO: validate URL format better
		if(!files[i].startsWith('http://') && !files[i].startsWith('https://') && !files[i].startsWith('ipfs://')) {
			res.status(400).send({
				message: "Invalid files URI."
			});
			return;
		}
	}

	// validate quote
	Quote.get(quoteId, async (err, quote) => {
		if(err) {
			if(err.code == 404) {
				res.status(404).send({
					message: "Quote not found"
				});
				return;
			}
			res.status(500).send({
				message:
					err.message || "Error occurred while looking up status."
			});
		}

		// see if token still accepted
		const paymentToken = acceptToken(quote.chainId, quote.tokenAddress);
		if(!paymentToken) {
			res.status(400).send({
				message: "Payment token no longer accepted."
			});
			return;
		}

		// check if new price is sufficient
		const bundlr = new Bundlr.default(process.env.ARWEAVE_GATEWAY_URI, paymentToken, process.env.PRIVATE_KEY);

		const priceWei = await bundlr.getPrice(quote.size);
		const tokenAmount = bundlr.utils.unitConverter(priceWei);

		if(parseFloat(tokenAmount) > quote.tokenAmount) {
			res.status(402).send({
				message: "Quoted tokenAmount is less than current rate."
			});
			return;
		}

		res.send(null); // send 200
		/* TODO:
			Set quote status to 2
			Pull WETH from user's account into our EOA using transferFrom(userAddress, amount)
			Unwrap WETH to ETH
			Fund our EOA's Bundlr Account using Bundlr.fund()
			Set quote status to 3
			Set quote status to 4
			Download the file(s) from the URI(s)
			Upload the file(s) to Arweave using Bundlr.upload(file)
			HEAD request to Arweave Gateway to verify that file uploaded successfully> Note Update quote status in database throughout.
			Set quote status to 5
		*/
	});
};
