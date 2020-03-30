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
    options: [{ arg: "p", describe: "port number or process name" }]
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

new ucmd("network")
  .describer({
    main: "display live network"
    // options: [{ arg: "m", describe: "monitor network status", boolean: true }]
  })
  .perform(argv => {
    // if (argv.m)
    return cmd("sudo nethogs -sa");
  });

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
      { arg: "d", describe: "display the command", boolean: true },
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
      { arg: "d", describe: "directory only", boolean: true },
      { arg: "f", describe: "file only", boolean: true },
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
      { arg: "n", describe: "name of alias" },
      { arg: "r", describe: "refresh keygen token", boolean: true }
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
      { arg: "v", describe: "value of the path" },
      { arg: "a", describe: "alias, can use command directly", boolean: true },
      { arg: "e", describe: "environmental variable as $", boolean: true },
      { arg: "p", describe: "PATH variable, typical sbin", boolean: true },
      { arg: "d", describe: "display bash_mine", boolean: true }
    ]
  })
  .perform(argv => {
    let target = `>> ~/.bash_mine`;
    if (!(argv.a || argv.e || argv.p || argv.d)) console.log("argument empty, -a as alias, -e as $, -p as sbin");
    if (!argv.d && !argv.n) return console.log("exit:1 name of the path undefined");
    if ((argv.a || argv.e) && !argv.v) return console.log("exit:1 value of the path undefined");
    if (argv.a) cmd(`echo "alias ${argv.n}='${argv.v}'"` + target);
    if (argv.e) cmd(`echo "export ${argv.n}=${argv.v}"` + target);
    if (argv.p) cmd(`echo 'export PATH="${argv.n}:$PATH"'` + target);
    if (argv.d) cmd("cat ~/.bash_mine");
  });

new ucmd("unlock", "path")
  .describer({
    main: "check which process is using the lock",
    options: [{ arg: "p", describe: "path of the locked file" }]
  })
  .perform(argv => cmd("sudo fuser -v " + argv.p));

new ucmd("docker")
  .describer({
    main: "docker additional command",
    options: [
      { arg: "c", describe: "clean <none> images", boolean: true },
      { arg: "i", describe: "images display", boolean: true },
      { arg: "p", describe: "process list AKA containter", boolean: true },
      { arg: "a", describe: "all display", boolean: true },
      { arg: "n", describe: "network status" }
    ]
  })
  .perform(argv => {
    if (argv.c) cmd("sudo docker system prune");
    if (argv.i) cmd("sudo docker images" + (argv.a ? " -a" : ""));
    if (argv.p) cmd("sudo docker ps" + (argv.a ? " -a" : ""));
    if (argv.n) argv.n === true ? cmd("sudo docker network ls") : cmd("sudo docker network inspect " + argv.n);
  });

new ucmd().run();
