module.exports.options = {
  appid: "<APPID>",
  host: "<URL>",	// NO http:// !!! just the pure domain name
  port: "<PORT>",
  headers: {
      'Authorization': 'Basic ' + new Buffer(encodeURIComponent("<USER>") + ":" + encodeURIComponent("<PASSWORD>")).toString("base64"),
      'Content-Type': 'text/html'
  },
  useHttps: false,
  rejectUnauthorized: false, // Change to false if you self-signed your certificate
  reAsk: false       // Change to false if Alexa should only ask once
};
