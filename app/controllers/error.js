errorResponse = (res, statusCode, message) => {
    console.error(`error: ${statusCode}: ${message}`);
    res.status(statusCode).send({message: message});
}

module.exports = { errorResponse };
