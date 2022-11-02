errorResponse = (req, res, err, statusCode, message) => {
	const userError = { message: message };
	const systemError = err ? err?.name + " " + err?.message ?? err : message;
	console.error(`${req.path} response: ${statusCode}: ${systemError}`);
	res.status(statusCode).send(userError);
}

module.exports = { errorResponse };
