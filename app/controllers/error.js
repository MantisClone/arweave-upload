errorResponse = (req, res, statusCode, message) => {
    console.error(`${req.path} response: ${statusCode}: ${message}`);
    res.status(statusCode).send({message: message});
}

module.exports = { errorResponse };
