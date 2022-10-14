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

Quote.create = (newQuote, result) => {
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

Quote.status = (quoteId, result) => {
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

module.exports = Quote;
