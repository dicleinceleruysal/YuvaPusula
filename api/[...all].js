const handler = require('./index.js');

module.exports = async (req, res) => {
    return await handler(req, res);
};
