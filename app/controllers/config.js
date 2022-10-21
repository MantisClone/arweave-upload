const tokens = require("./tokens.js");
const { URL } = require('url');

const checkConfig = () => {
	const acceptedPayments = process.env.ACCEPTED_PAYMENTS;
	if(acceptedPayments == null) {
		console.log("ACCEPTED_PAYMENTS environment variable not set");
		return false;
	}

	const bundlrUri = process.env.BUNDLR_URI;
	if(bundlrUri == null) {
		console.log("BUNDLR_URI environment variable not set");
		console.log("Try https://node1.bundlr.network or https://devnet.bundlr.network");
		return false;
	}
	try {		
		const bundlrUrl = new URL(bundlrUri);
		if(bundlrUrl.protocol != "http:" && bundlrUrl.protocol != "https:") {
			console.log("BUNDLR_URI is should be http or https");
			return false;
		}
	}
	catch(err) {
		console.log("BUNDLR_URI is invalid");
		return false;
	}

	const privateKey = process.env.PRIVATE_KEY;
	if(privateKey == null) {
		console.log("PRIVATE_KEY environment variable not set");
		return false;
	}
	const keyRegex = /^[0-9A-F]{64,}$/i;
	if(!keyRegex.test(privateKey)) {
		console.log("PRIVATE_KEY environment variable has invalid format");
		return false;
	}

	const sqlitePath = process.env.SQLITE_DB_PATH;
	if(sqlitePath == null) {
		console.log("SQLITE_DB_PATH environment variable not set");
		return false;
	}

	const port = process.env.PORT;
	if(port != null && isNaN(port)) {
		console.log("PORT environment variable should be a number");
		return false;
	}

	const registrationInterval = process.env.REGISTRATION_INTERVAL;
	if(registrationInterval != null && isNaN(registrationInterval)) {
		console.log("REGISTRATION_INTERVAL environment variable should be the number of milliseconds between registration calls");
		return false;
	}

	const dbsUri = process.env.DBS_URI;
	if(dbsUri == null) {
		console.log("DBS_URI environment variable not set");
		return false;
	}
	if(dbsUri != "DEBUG") {
		try {		
			const dbsUrl = new URL(dbsUri);
			if(dbsUrl.protocol != "http:" && dbsUrl.protocol != "https:") {
				console.log("DBS_URI is should be http or https");
				return false;
			}
		}
		catch(err) {
			console.log("DBS_URI is invalid");
			return false;
		}
	}

	const selfUri = process.env.SELF_URI;
	if(selfUri == null) {
		console.log("SELF_URI environment variable not set");
		return false;
	}
	try {		
		const selfUrl = new URL(selfUri);
		if(selfUrl.protocol != "http:" && selfUrl.protocol != "https:") {
			console.log("SELF_URI is should be http or https");
			return false;
		}
	}
	catch(err) {
		console.log("SELF_URI is invalid");
		return false;
	}

	return true;
};

module.exports = { checkConfig };
