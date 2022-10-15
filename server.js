const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.disable('x-powered-by');

// TODO: validate config

app.use(function(req, res, next) {
    next(); // moves to next middleware
});

// parse requests of content-type - application/json
app.use(bodyParser.json());
app.use(function(error, req, res, next) {
	// catch json error
	console.log("JSON ERROR");
	res.status(400).send({
		message: "Invalid JSON"
	});
});

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// simple route
app.get("/", (req, res) => {
	res.json({ message: "Welcome to API application." });
});
app.get("/robots.txt", (req, res) => {
	res.set("Content-Type", "text/plain");
	res.send("User-agent: *\nDisallow: /\n");
});

require("./app/routes/quote.routes.js")(app);
require("./app/routes/upload.routes.js")(app);

// set port, listen for requests
const PORT = process.env.PORT || 8081;
app.listen(PORT, "localhost", () => {
	console.log(`API Server is running on port ${PORT}.`);
	// TODO: call timer regration function
});
