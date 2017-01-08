// If you setup basic auth in node-sonos-http-api's settings.json, change the username
// and password here.  Otherwise, just leave this alone and it will work without auth.
var auth = new Buffer("<USER>" + ":" + "<PASSWORD>").toString("base64");
var REPLACE_TEXT = {WZ:"Wohnzimmer",EZ:"Esszimmer",AZ:"Arbeitszimmer",OG:"Obergeschoss",KiZi2:"Kinderzimmer",KiZi1:"Gästezimmer",EG:"Erdgeschoss", WiGa:"Wintergarten",SZ:"Schlafzimmer"};


var options = {
  appid: "<APPID>",
  host: "<URL>",
  port: "<PORT>",
  headers: {
      'Authorization': 'Basic ' + auth,
      'Content-Type': 'text/html'
  },
  useHttps: false, // Change to true if you setup node-sonos-http-api with HTTPS
  rejectUnauthorized: true, // Change to false if you self-signed your certificate
};

module.exports = options;
