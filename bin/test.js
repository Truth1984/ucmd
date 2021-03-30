var ucmd = require("../helper/_helper");
var cmd = require("../helper/_cmd");
var cmdq = require("../helper/_cmdQs");
var download = require("../helper/downloader");
var recorder = require("../helper/quickRecord");
var os = require("os");
var fs = require("fs");
var read = require("readdirp");

new ucmd("_test").perform((argv) => console.log("testing"));

new ucmd("_author").perform(() => console.log("Awada.Z"));

new ucmd("_home").perform(() => cmd("echo ~", true));

new ucmd("_ask").describer({ main: "asking test" }).perform((argv) => {
  cmdq({ "what is your name": false, "your password": true }).then(console.log);
});

new ucmd("_do", "task")
  .describer({ main: "pipe task", options: [{ arg: "t", describe: "task to pipe", alias: "pipe" }] })
  .perform((argv) => cmd(argv.t));

new ucmd("_echo", "line").describer({ main: "echo cmd", options: [{ arg: "l", describe: "line" }] }).perform((argv) => {
  console.log(argv.l);
  cmd(`echo '${argv.l}'`);
});

new ucmd("_debug").describer({ main: "debug mode" }).perform((argv) => console.log("UDEBUG=1"));
