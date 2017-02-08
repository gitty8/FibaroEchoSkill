/*
var options = {
  appid: "<APPID>",
  host: "<URL>",	// NO http:// !!! just the pure domain name
  port: "<PORT>",
  headers: {
      'Authorization': 'Basic ' + new Buffer(encodeURIComponent("<USER>") + ":" + encodeURIComponent("<PASSWORD>")).toString("base64"),
      'Content-Type': 'text/html'
  },
  useHttps: false,
  rejectUnauthorized: false, // Change to false if you self-signed your certificate
  reAsk: true       // Change to false if Alexa should only ask once
};
*/

module.exports.options = {
  appid: "amzn1.ask.skill.ac1f17ee-23e1-4c3d-9b93-2e4d9c4cb871",
  host: "lemmum.ddns.net",
  port: "888",
  headers: {
      'Authorization': 'Basic ' + new Buffer(encodeURIComponent("admin") + ":" + encodeURIComponent("fibarohelp")).toString("base64"),
      'Content-Type': 'text/html'
  },
  useHttps: true,
  rejectUnauthorized: false, // Change to false if you self-signed your certificate
  reAsk: false       // Change to false if Alexa should only ask once
};
