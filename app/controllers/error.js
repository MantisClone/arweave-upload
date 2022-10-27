errorResponse = (req, res, statusCode, message) => {
    const error = { message: message };
    console.error(`${req.path} response: ${statusCode}: ${JSON.stringify(error, null, 4)}`);
    res.status(statusCode).send(error);
}

module.exports = { errorResponse };
