#!/usr/bin/env node

var ucmd = require("./_helper");
var cmd = require("./_cmd");

new ucmd("port", "portnum")
  .describer({
    main: "scan for a specific port",
    options: { arg: "portnum", describe: "port number", default: "3000" }
  })
  .perform(argv => {
    cmd("lsof -i tcp:" + argv.portnum, true);
  });
