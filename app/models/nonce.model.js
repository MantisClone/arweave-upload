const sql = require("./db.js");

// constructor
const Nonce = function(nonce) {
	this.userAddress = nonce.userAddress;
	this.nonce = nonce.nonce;
};

Nonce.get = (userAddress, result) => {
	const query = `
		SELECT *
		FROM nonce
		WHERE userAddress = ?;
	`;

	sql.get(query, [userAddress], (err, res) => {
		if(err) {
			console.log("error:", err);
			result(err, null);
			return;
		}
		result(null, res);
	});
}

Nonce.set = (userAddress, nonce) => {
	const query = 'INSERT OR REPLACE INTO nonce (userAddress, nonce) VALUES (?, ?);';
	sql.run(query, [userAddress, nonce], (err, res) => {
		if(err) {
			console.log("error:", err);
			return;
		}
	});
};

module.exports = Nonce;
