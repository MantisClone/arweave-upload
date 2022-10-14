//const fs = require('fs');
const sqlite3 = require('sqlite3');

const db_file = process.env.SQLITE_DB_PATH;

const create_quote = `
	CREATE TABLE IF NOT EXISTS "quote" (
		"quoteId"	TEXT NOT NULL UNIQUE,
		"status"	INTEGER NOT NULL,
		"created"	INTEGER NOT NULL,
		"chainId"	INTEGER NOT NULL,
		"tokenAddress"	TEXT NOT NULL,
		"userAddress"	TEXT NOT NULL,
		"tokenAmount"	REAL,
		"approveAddress"	TEXT NOT NULL,
		PRIMARY KEY("quoteId")
	);
`;

const create_files = `
	CREATE TABLE IF NOT EXISTS "files" (
		"quoteId"	TEXT NOT NULL,
		"index"	INTEGER NOT NULL,
		"length"	INTEGER NOT NULL,
		"hash"	TEXT,
		"transactionHash"	TEXT,
		FOREIGN KEY("quoteId") REFERENCES "quote"("quoteId") ON DELETE CASCADE,
		PRIMARY KEY("quoteId","index")
	);
`;

const db = new sqlite3.Database(db_file, (err) => {
	if(err) {
		console.log('Could not connect to database', err);
		// TODO: should we quit?
	}
	else {
		check_sql = "SELECT name FROM sqlite_master WHERE type='table' AND name='quote';";
		db.get(check_sql, [], (err, res) => {
			if(err) {
				// unable to tell if quote table exists
				console.log(err);
				return;
			}
			else {
				if(res) {
					console.log('Connected to existing database');
				}
				else {
					// no quote table, create
					db.get(create_quote, [], (err, res) => {
						if(err) {
							console.log(err);
							return false;
						}
						console.log("Created quote table");
					});
					db.get(create_files, [], (err, res) => {
						if(err) {
							console.log(err);
							return false;
						}
						console.log("Created files table");
					});

				}
			}
		});
	}
});

module.exports = db;

