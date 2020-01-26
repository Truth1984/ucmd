#!/usr/bin/env node

var ucmd = require("../helper/_helper");
var cmd = require("../helper/_cmd");
var download = require("../helper/downloader");
var os = require("os");
let random = () => Math.floor(Math.random() * 10000).toString();

new ucmd("port", "portnum")
  .describer({
    main: "scan for a specific port",
    options: { arg: "p", describe: "port number", default: "3000" }
  })
  .perform(argv => {
    cmd("lsof -i tcp:" + (argv._[1] ? argv._[1] : argv.p), true);
  });

new ucmd("ip")
  .describer({ main: "find local ip adress" })
  .perform(argv => cmd("ifconfig en0 | grep 192.168", true));

new ucmd("targz", "path")
  .describer({
    main: "typical tar command",
    options: { arg: "p", describe: "path" }
  })
  .perform(argv => {
    let target = argv._[1] ? argv._[1] : argv.p;
    let dest = target.split(".")[0] + random();
    let command = `mkdir ${dest} && tar -xf ${target} -C ${dest} && cd ${dest} && cd * && ./configure && make && sudo make install`;
    cmd(command, true);
  });

new ucmd("open", "location")
  .describer({
    main: "open the file or location",
    options: [{ arg: "l", describe: "location", default: "." }]
  })
  .perform(argv => {
    if (process.platform == "darwin") cmd(`open ${argv.l}`);
    if (process.platform == "linux") cmd(`xdg-open ${argv.l}`);
  });

new ucmd("download", "url", "filename")
  .describer({
    main: "download the file into ~/Download folder",
    options: [
      { arg: "u", describe: "url or m3u8" },
      { arg: "f", describe: "filename or location" }
    ]
  })
  .perform(argv => {
    let filename = argv.f;
    if (!/^[~!]|^(.\/)/.test(filename))
      filename = os.homedir + "/Downloads/" + filename;
    let url = argv.u;
    if (/m3u8$/.test(url)) {
      download.m3u8(url, filename);
    } else {
      download.download(url, filename);
    }
  });

new ucmd().run();
