const sql = require("./db.js");

// constructor
const File = function(file) {
	this.quoteId = file.quoteId;
	this.index = file.index;
	this.length = file.length;
	this.hash = file.hash;
	this.transactionHash = file.transactionHash;
};

File.get = async (quoteId, index, result) => {
	const query = `
		SELECT *
		FROM files
		WHERE "quoteId" = ?
		AND "index" = ?;
	`;

	sql.get(query, [quoteId, index], (err, res) => {
		if(err) {
			console.log("error:", err);
			result(err, null);
			return;
		}
		result(null, res);
	});
}

File.setHash = async (quoteId, index, transactionHash) => {
	const query = `
		UPDATE files SET transactionHash = ?
		WHERE "quoteId" = ?
		AND "index" = ?;
	`;

	sql.run(query, [transactionHash, quoteId, index], (err, res) => {
		if(err) {
			console.log("error:", err);
		}
	});
}

module.exports = File;
