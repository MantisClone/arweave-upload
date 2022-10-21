const sql = require("./db.js");

// constructor
const Quote = function(quote) {
	this.quoteId = quote.quoteId;
	this.status = quote.status;
	this.created = quote.created;
	this.chainId = quote.chainId;
	this.tokenAddress = quote.tokenAddress;
	this.userAddress = quote.userAddress;
	this.tokenAmount = quote.tokenAmount;
	this.approveAddress = quote.approveAddress;
	this.files = quote.files;
};

// status constants
Quote.QUOTE_STATUS_NONE = 0;
Quote.QUOTE_STATUS_WAITING = 1;
Quote.QUOTE_STATUS_PAYMENT_START = 2;
Quote.QUOTE_STATUS_PAYMENT_END = 3;
Quote.QUOTE_STATUS_UPLOAD_START = 4;
Quote.QUOTE_STATUS_UPLOAD_END = 5;
Quote.QUOTE_STATUS_PAYMENT_FAILED = 6;

Quote.create = async (newQuote, result) => {
	const params = [
		newQuote.quoteId,
		newQuote.status,
		newQuote.created,
		newQuote.chainId,
		newQuote.tokenAddress,
		newQuote.userAddress,
		newQuote.tokenAmount,
		newQuote.approveAddress,
	];

	const quote_sql = 'INSERT INTO quote (quoteId, status, created, chainId, tokenAddress, userAddress, tokenAmount, approveAddress) VALUES (?, ?, ?, ?, ?, ?, ?, ?);'
	sql.run(quote_sql, params, (err, res) => {
		if(err) {
			console.log("error:", err);
			result(err, null);
			return;
		}

		// generate files sql
		const placeholders = newQuote.files.map(() => "(?, ?, ?)").join(', ');
		const files_sql = 'INSERT INTO files ("quoteId", "index", "length") VALUES ' + placeholders;

		let files_params = [];
		newQuote.files.forEach((length, index) => {
			const arr = [newQuote.quoteId, index, length];
			files_params = [...files_params, ...arr];
		});

		sql.run(files_sql, files_params, (err, res) => {
			if(err) {
				console.log("error:", err);
				result(err, null);
				return;
			}
			// remove from output
			delete newQuote.status;
			delete newQuote.created;
			delete newQuote.userAddress;
			delete newQuote.files;

			result(null, newQuote);
		});
	});
};

Quote.get = async (quoteId, result) => {
	const quote_sql = `
		SELECT *, (SELECT SUM(length) FROM files WHERE quoteId = ?) AS 'size'
		FROM quote
		WHERE quoteId = ?;
	`;

	sql.get(quote_sql, [quoteId, quoteId], (err, res) => {
		if(err) {
			console.log("error:", err);
			result(err, null);
			return;
		}

		if(!res) {
			result({"code": 404, "message": "Quote not found"}, null);
			return;
		}

		result(null, res);
	});
}

Quote.getStatus = async (quoteId, result) => {
	const status_sql = "SELECT status FROM quote WHERE quoteId = ?;";

	sql.get(status_sql, [quoteId], (err, res) => {
		if(err) {
			console.log("error:", err);
			result(err, null);
			return;
		}

		if(!res) {
			result({"code": 404, "message": "Quote not found"}, null);
			return;
		}

		result(null, res);
	});
}

Quote.setStatus = async (quoteId, status) => {
	const quote_sql = 'UPDATE quote SET status = ? WHERE quoteId = ?;'
	sql.run(quote_sql, [status, quoteId], (err, res) => {
		if(err) {
			console.log("error:", err);
			return;
		}
	});
};

Quote.getLink = async (quoteId, result) => {
	// check status
	Quote.getStatus(quoteId, (err, data) => {
		if(err) {
			if(err.code == 404) {
				console.log(`Can't find quote ${quoteID}`);
				result({"code": 404, "message": "Quote not found"}, null);
				return;
			}
			console.log("error:", err);
			result(err, null);
			return;
		}
		if(data.status != Quote.QUOTE_STATUS_UPLOAD_END) {
			result({"code": 404, "message": "Upload not completed yet."}, null);
			return;
		}

		const query = `SELECT "arweave" AS "type", transactionHash
			FROM files
			WHERE quoteId = ?
			ORDER BY "index" ASC;`;

		sql.all(query, [quoteId], (err, rows) => {
			if(err) {
				console.log("error:", err);
				result(err, null);
				return;
			}

			if(!rows) {
				result({"code": 404, "message": "No transaction hashes found"}, null);
				return;
			}

			result(null, rows);
		});
	});
};

module.exports = Quote;
