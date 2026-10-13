// Share the public configuration endpoint with the Vercel deployment.
const gameConfig = require('../../api/game-config');

exports.handler = async () => {
  let statusCode = 200;
  const headers = {};
  let body;
  gameConfig({}, {
    setHeader(name, value) { headers[name] = value; },
    status(code) { statusCode = code; return this; },
    json(value) { body = JSON.stringify(value); return this; }
  });
  return { statusCode, headers, body };
};
