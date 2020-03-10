#!/usr/bin/env node

var ucmd = require("../helper/_helper");
var cmd = require("../helper/_cmd");
var download = require("../helper/downloader");
var recorder = require("../helper/quickRecord");
var os = require("os");
var fs = require("fs");
var read = require("readdirp");
var paths = require("path");
let random = () => Math.floor(Math.random() * 10000).toString();

new ucmd("port", "portnum")
  .describer({
    main: "scan for a specific port",
    options: [{ arg: "p", describe: "port number" }]
  })
  .perform(argv => {
    if (os.platform() == "win32") {
      if (!argv.p) return cmd("netstat -bn");
      return cmd("netstat -bn | grep " + argv.p);
    }
    if (!argv.p) return cmd("sudo netstat -plntu");
    return cmd("sudo netstat -lntup | grep " + argv.p);
  });

new ucmd("ip").describer({ main: "find local ip adress" }).perform(argv => cmd("ifconfig | grep inet", true));

new ucmd("targz", "path")
  .describer({
    main: "typical tar command",
    options: [{ arg: "p", describe: "path" }]
  })
  .perform(argv => {
    let target = argv._[1] ? argv._[1] : argv.p;
    console.log("optional run ./configure & make & sudo make install afterwards");
    let command = `tar -xf ${target}`;
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
    if (!/^[~!]|^(.\/)/.test(filename)) filename = os.homedir + "/Downloads/" + filename;
    let url = argv.u;
    if (/\.m3u8/.test(url)) {
      download.m3u8(url, filename);
    } else {
      download.download(url, filename);
    }
  });

new ucmd("quick", "name", "cmd")
  .describer({
    main: "quick record cmd into local file",
    options: [
      { arg: "n", describe: "name of the cmd" },
      { arg: "c", describe: "command to record" },
      { arg: "a", describe: "append command to end of line" },
      { arg: "d", describe: "display the command" },
      { arg: "r", describe: "remove file with name" }
    ]
  })
  .perform(argv => {
    if (argv.d) return recorder.display();
    if (argv.c) return recorder.record(argv.n, argv.c);
    if (argv.n) {
      let result = recorder.perform(argv.n);
      return result ? cmd(argv.a ? result + " " + argv.a : result, true) : "";
    }
    if (argv.r) return recorder.remove(argv.r);
  });

new ucmd("search", "target", "basedir")
  .describer({
    main: "find the file in location, basedir default to current location",
    options: [
      { arg: "t", describe: "target filename" },
      { arg: "b", describe: "base directory of the file" },
      { arg: "d", describe: "directory only" },
      { arg: "f", describe: "file only" },
      { arg: "s", describe: "subdirectory depth", default: 2 }
    ]
  })
  .perform(async argv => {
    if (!argv.b) argv.b = process.cwd();
    let target = argv.t;
    let basedir = argv.b;
    let directoryOnly = argv.d;
    let fileOnly = argv.f;
    let depth = argv.s;

    let nameArr = await read.promise(basedir, { type: "files_directories", depth });

    if (!directoryOnly && !fileOnly) {
      for (let i of nameArr) if (i.basename.indexOf(target)) console.log(i);
    } else {
      for (let i of nameArr)
        if (i.basename.indexOf(target) > -1 && (i.dirent.isDirectory() ? directoryOnly : fileOnly)) console.log(i);
    }
  });

new ucmd("sysinfo").describer({ main: "display system information" }).perform(argv => {
  console.log({
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    username: os.userInfo().username
  });
  cmd("lsb_release -a");
});

new ucmd("ssh", "address", "username")
  .describer({
    main: "use keygen to generate key pairs",
    options: [
      { arg: "a", describe: "address" },
      { arg: "u", describe: "username of the host", default: os.userInfo().username },
      { arg: "n", describe: "name of allias" },
      { arg: "r", describe: "refresh keygen token" }
    ]
  })
  .perform(argv => {
    let keygen = "ssh-keygen -t rsa -b 4096";
    if (argv.r) cmd(keygen);
    cmd(`if ! [ -f $HOME/.ssh/id_rsa ]; then ${keygen}; fi;`);
    let finalAddress = argv.a;
    if (argv.a.toString().indexOf("@") == -1) finalAddress = argv.u + "@" + argv.a;
    cmd("ssh-copy-id -i ~/.ssh/id_rsa.pub " + finalAddress);
    if (argv.n) cmd(`u quick ssh${argv.n} "ssh ${finalAddress}"`);
  });

new ucmd("gitclone", "name", "user")
  .describer({
    main: "git clone into current folder",
    options: [
      { arg: "n", describe: "name of the project" },
      { arg: "u", describe: "username", default: "Truth1984" },
      { arg: "d", describe: "destination of download" }
    ]
  })
  .perform(argv => {
    let user = argv.u;
    let project = argv.n;
    let dest = argv.d ? argv.d : `~/Documents/${project}`;
    cmd(`git clone https://github.com/${user}/${project}.git ${dest}`);
  });

new ucmd("addPath", "name", "value")
  .describer({
    main: "add path variable to ~/.bash_mine",
    options: [
      { arg: "n", describe: "name of the path" },
      { arg: "v", describe: "value of the path" }
    ]
  })
  .perform(argv => {
    if (!(argv.n && argv.v)) return console.log("arguments empty");
    cmd(`echo "export ${argv.n}=${argv.v}" >> ~/.bash_mine`);
  });

new ucmd().run();
