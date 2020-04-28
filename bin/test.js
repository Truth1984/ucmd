var ucmd = require("../helper/_helper");
var cmd = require("../helper/_cmd");
var cmdq = require("../helper/_cmdQs");
var download = require("../helper/downloader");
var recorder = require("../helper/quickRecord");
var os = require("os");
var fs = require("fs");
var read = require("readdirp");

new ucmd("_test").perform((argv) => console.log("testing"));

new ucmd("_ask").describer({ main: "asking test" }).perform((argv) => {
  cmdq({ "what is your name": false, "your password": true }).then(console.log);
});