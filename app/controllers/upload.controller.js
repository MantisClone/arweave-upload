const Bundlr = require("@bundlr-network/client");

const axios = require('axios');
const Upload = require("../models/upload.model.js");
const Quote = require("../models/quote.model.js");
const Nonce = require("../models/nonce.model.js");
const ethers = require('ethers');
const { acceptToken, getDefaultProviderUrl } = require("./tokens.js");

exports.upload = async (req, res) => {
	// Validate request
	if(!req.body) {
		res.status(400).send({
			message: "Content can not be empty!"
		});
		return;
	}

	// validate fields
	const quoteId = req.body.quoteId;
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

	const files = req.body.files;
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
				message: `Invalid files field on index ${i}.`
			});
			return;
		}
		// TODO: validate URL format better
		if(!files[i].startsWith('http://') && !files[i].startsWith('https://') && !files[i].startsWith('ipfs://')) {
			res.status(400).send({
				message: `Invalid files URI on index ${i}.`
			});
			return;
		}
	}

	const nonce = req.body.nonce;
	if(typeof nonce === "undefined") {
		res.status(400).send({
			message: "Missing nonce."
		});
		return;
	}
	if(typeof nonce !== "number") {
		res.status(400).send({
			message: "Invalid nonce."
		});
		return;
	}
	// TODO: check nonce

	const signature = req.body.signature;
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
					err.message || "Error occurred while validating quote."
			});
			return;
		}

		const userAddress = quote.userAddress;
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
						err.message || "Error occurred while validating quote."
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
		});

		// see if token still accepted
		const paymentToken = acceptToken(quote.chainId, quote.tokenAddress);
		if(!paymentToken) {
			res.status(400).send({
				message: "Payment token no longer accepted."
			});
			return;
		}

		// check status of quote
		if(quote.status != Quote.QUOTE_STATUS_WAITING) {
			if(quote.status == Quote.QUOTE_STATUS_UPLOAD_END) {
				res.status(400).send({
					message: "Quote has been completed."
				});
				return;
			}
			else {
				res.status(400).send({
					message: "Quote is being processed."
				});
				return;
			}
		}

		// check if new price is sufficient
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
			priceWei = await bundlr.getPrice(quote.size);
		}
		catch(err) {
			res.status(500).send({
				message: err.message
			});
			return;
		}

		const quoteTokenAmount = ethers.BigNumber.from(quote.tokenAmount);

		if(priceWei.gte(quoteTokenAmount)) {
			res.status(402).send({
				message: `Quoted tokenAmount is less than current rate. Quoted amount: ${quote.tokenAmount}, current rate: ${tokenAmount}`
			});
			return;
		}

		res.send(null); // send 200

		console.log("Hello World");

		// change status
		Quote.setStatus(quoteId, Quote.QUOTE_STATUS_PAYMENT_START);

		// Pull WETH or WMATIC from user's account into our EOA using transferFrom(userAddress, amount)
		const acceptedPayments = process.env.ACCEPTED_PAYMENTS.split(",");
		const jsonRpcUris = process.env.JSON_RPC_URIS.split(",");
		const jsonRpcUri = jsonRpcUris[acceptedPayments.indexOf(paymentToken)]
		let provider;
		if(jsonRpcUri === "default") {
			provider = ethers.getDefaultProvider(getDefaultProviderUrl(quote.chainId, quote.tokenAddress))
		}
		else {
			provider = ethers.getDefaultProvider(jsonRpcUri)
		}
		const signer = provider.getSigner()
		const abi = [
			'function transferFrom(address src, address dst, uint256 wad) external returns (bool)',
		];
		const wrapper = ethers.Contract("0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889", abi, signer);
		const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
		const tx = await wrapper.transferFrom({src: userAddress, dst: wallet.address, wad: priceWei});
		const txReceipt = tx.wait()

		console.log(`txReceipt = ${JSON.stringify(txReceipt)}`);

		// TODO: Unwrap WETH to ETH or WMATIC to MATIC

		// Fund our EOA's Bundlr Account
		// TODO: Check the balance first
		try {
			let response = await bundlr.fund(priceWei);
			// TODO: should we record the response values?
			/* {
				id: '0x15d26881006589bd3ac5366ebd5031d8c14a2755d962337fad7216744fe92ed5',
				quantity: '3802172224166296',
				reward: '45832500525000',
				target: '0x853758425e953739F5438fd6fd0Efe04A477b039'
			} */
		}
		catch(err) {
			// can't fund the quote
			console.log("Can't fund the quote.")
			console.log(err.message);
			return;
		}

		await Quote.setStatus(quoteId, Quote.QUOTE_STATUS_PAYMENT_END);
		await Quote.setStatus(quoteId, Quote.QUOTE_STATUS_UPLOAD_START);

		let files_uploaded = 0;
		await Promise.all(files.map(async (file, index) => {
			await Upload.get(quoteId, index, async (err, quotedFile) => {
				if(err) {
					console.log(err);
					return;
				}
				//console.log(`Quote index: ${index}, Qoute length: ${quotedFile.length}`);

				// download file
				await axios({
						method: "get",
						url: file,
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
						uploader.on("done", (finishRes) => {
							Upload.setHash(quoteId, index, finishRes.data.id);
							// TODO: HEAD request to Arweave Gateway to verify that file uploaded successfully

							files_uploaded = files_uploaded + 1;
							if(files_uploaded == files.length) {
								Quote.setStatus(quoteId, Quote.QUOTE_STATUS_UPLOAD_END);
							}
						});

						const transactionOptions = {tags: tags};
						try {
							// start upload
							uploader.uploadData(Buffer.from(response.data, "binary"), transactionOptions);
							// TODO: also hash the file
						}
						catch(error) {
							console.error(error.message);
						}
					})
					.catch(error => {
						console.log(error);
					});
			});
		}));
	});
};
