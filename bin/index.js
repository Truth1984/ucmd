#!/usr/bin/env node

var ucmd = require("../helper/_helper");
var cmd = require("../helper/_cmd");
var cmdq = require("../helper/_cmdQs");
var download = require("../helper/downloader");
var recorder = require("../helper/quickRecord");
var os = require("os");
var fs = require("fs");
var read = require("readdirp");
var paths = require("path");
let random = () => Math.floor(Math.random() * 10000).toString();
require("./test");

new ucmd("port", "portnum")
  .describer({
    main: "scan for a specific port",
    options: [{ arg: "p", describe: "port number or process name" }],
  })
  .perform((argv) => {
    if (os.platform() == "win32") {
      if (!argv.p) return cmd("netstat -bn");
      return cmd("netstat -bn | grep " + argv.p);
    }
    if (!argv.p) return cmd("sudo netstat -plntu");
    return cmd("sudo netstat -lntup | grep " + argv.p);
  });

new ucmd("ip").describer({ main: "find local ip adress" }).perform((argv) => cmd("ifconfig | grep inet", true));

new ucmd("network", "device")
  .describer({
    main: "display live network",
    options: [
      { arg: "d", describe: "device for showing network details" },
      { arg: "l", describe: "list the network", boolean: true },
    ],
  })
  .perform((argv) => {
    if (argv.l) return cmd("sudo netstat -i");
    if (argv.d) return cmd("sudo nethogs " + argv.d);
    return cmd("sudo nethogs -s");
  });

new ucmd("targz", "path")
  .describer({
    main: "typical tar command",
    options: [{ arg: "p", describe: "path" }],
  })
  .perform((argv) => {
    let target = argv._[1] ? argv._[1] : argv.p;
    console.log("optional run ./configure & make & sudo make install afterwards");
    let command = `tar -xf ${target}`;
    cmd(command, true);
  });

new ucmd("open", "location")
  .describer({
    main: "open the file or location",
    options: [
      { arg: "l", describe: "location", default: "." },
      { arg: "d", describe: "~/Documents relative path" },
    ],
  })
  .perform((argv) => {
    if (argv.d) argv.l = "~/Documents/" + argv.l;
    if (process.platform == "darwin") cmd(`open ${argv.l}`);
    if (process.platform == "linux") cmd(`xdg-open ${argv.l}`);
  });

new ucmd("download", "url", "filename")
  .describer({
    main: "download the file into ~/Download folder",
    options: [
      { arg: "u", describe: "url or m3u8" },
      { arg: "f", describe: "filename or location" },
    ],
  })
  .perform((argv) => {
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
      { arg: "a", describe: "append command to '...' or end of line" },
      { arg: "d", describe: "display the command", boolean: true },
      { arg: "r", describe: "remove file with name" },
    ],
  })
  .perform((argv) => {
    if (argv.d) return recorder.display();
    if (argv.c) return recorder.record(argv.n, argv.c);
    if (argv.n) {
      let result = recorder.perform(argv.n);
      return result
        ? cmd(
            argv.a ? (result.indexOf("...") > -1 ? result.replace("...", argv.a) : result + " " + argv.a) : result,
            true
          )
        : "";
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
      { arg: "s", describe: "subdirectory depth", default: 2 },
    ],
  })
  .perform(async (argv) => {
    if (!argv.b) argv.b = process.cwd();
    let target = argv.t;
    let basedir = argv.b;
    let directoryOnly = argv.d;
    let fileOnly = argv.f;
    let depth = argv.s;

    let nameArr = await read.promise(basedir, { type: "files_directories", depth });

    if (!directoryOnly && !fileOnly) {
      for (let i of nameArr) if (i.basename.indexOf(target) > -1) console.log(i);
    } else {
      for (let i of nameArr)
        if (i.basename.indexOf(target) > -1 && (i.dirent.isDirectory() ? directoryOnly : fileOnly)) console.log(i);
    }
  });

new ucmd("sysinfo")
  .describer({
    main: "display system information",
    options: [
      { arg: "f", describe: "file name of information", boolean: true },
      { arg: "d", describe: "disk information", boolean: true },
    ],
  })
  .perform((argv) => {
    if (argv.f) return cmd("ls -alF");
    if (argv.d) return cmd("df -h");
    console.log({
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      username: os.userInfo().username,
    });
    cmd("cat /etc/os-release");
  });

new ucmd("ssh", "address", "username")
  .describer({
    main: "use keygen to generate key pairs",
    options: [
      { arg: "a", describe: "address" },
      { arg: "u", describe: "username of the host", default: os.userInfo().username },
      { arg: "n", describe: "name of alias" },
      { arg: "r", describe: "refresh keygen token", boolean: true },
    ],
  })
  .perform((argv) => {
    let keygen = "ssh-keygen -t rsa -b 4096";
    if (argv.r) cmd(keygen);
    cmd(`if ! [ -f $HOME/.ssh/id_rsa ]; then ${keygen}; fi;`);
    let finalAddress = argv.a;
    if (argv.a.toString().indexOf("@") == -1) finalAddress = argv.u + "@" + argv.a;
    cmd("ssh-copy-id -i ~/.ssh/id_rsa.pub " + finalAddress);
    if (argv.n) cmd(`u quick ssh${argv.n} "ssh ${finalAddress}"`);
  });

new ucmd("process", "name")
  .describer({
    main: "show list of current process",
    options: [{ arg: "n", describe: "name to grep" }],
  })
  .perform((argv) => {
    if (!argv.n) return cmd("ps -aux");
    return cmd("ps -aux | grep " + argv.n);
  });

new ucmd("gitclone", "name", "user")
  .describer({
    main: "git clone into current folder",
    options: [
      { arg: "n", describe: "name of the project" },
      { arg: "u", describe: "username", default: "Truth1984" },
      { arg: "d", describe: "destination of download" },
    ],
  })
  .perform((argv) => {
    let user = argv.u;
    let project = argv.n;
    let dest = argv.d ? argv.d : `~/Documents/${project}`;
    cmd(`git clone https://github.com/${user}/${project}.git ${dest}`);
  });

new ucmd("gitwatch", "location", "branchName", "interval")
  .describer({
    main: "watch file changes, auto pull every X seconds, require git, crontab, watch",
    options: [
      { arg: "l", describe: "project full location" },
      { arg: "b", describe: "target branch", default: "master" },
      { arg: "i", describe: "watch interval", default: 30 },
    ],
  })
  .perform((argv) => {
    if (!argv.l) return console.log("location not specified");
    argv.l = argv.l.replace("~", process.env.HOME);
    let stored = process.env.HOME + "/.application/cronfile";
    let content = cmd("crontab -l ", false, true);
    let screenName = "gitwatch_" + paths.basename(argv.l);
    let scriptLocation = process.env.HOME + "/.application/gitwatch_" + paths.basename(argv.l) + ".sh";
    if (content.indexOf(screenName) > -1) return console.log(screenName, "already exist, modify by using crontab -e");

    cmd(`touch ${scriptLocation} && chmod 777 ${scriptLocation}`);
    let scriptContent = `cd ${argv.l}
var=$(git pull origin ${argv.b})
if echo $var | grep -q "done" || echo $var | grep -q "Already up-to-date"; then
    echo $var
fi`;
    fs.writeFileSync(scriptLocation, scriptContent);
    fs.writeFileSync(
      stored,
      content + `\n@reboot screen -dmS ${screenName} watch -n ${argv.i} "sh ${scriptLocation}" \n`
    );
    cmd("crontab " + stored);
    console.log("further modify:", scriptLocation);
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
      { arg: "d", describe: "display bash_mine", boolean: true },
      { arg: "o", describe: "modify the file", boolean: true },
    ],
  })
  .perform((argv) => {
    let target = `>> ~/.bash_mine`;
    if (argv.o) return cmd("nano ~/.bash_mine");
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
    options: [{ arg: "p", describe: "path of the locked file" }],
  })
  .perform((argv) => cmd("sudo fuser -v " + argv.p));

new ucmd("service", "name")
  .describer({
    main: "list all the service",
    options: [
      { arg: "n", describe: "name of the service, check stauts" },
      { arg: "e", describe: "enable a service" },
      { arg: "d", describe: "disable a service" },
      { arg: "a", describe: "active process", boolean: true },
      { arg: "i", describe: "inactive process", boolean: true },
    ],
  })
  .perform((argv) => {
    let services = cmd(`service --status-all`, false, true).split("\n");

    let fuzzy = (name) => {
      let target = services.filter((item) => item.indexOf(name) > -1).map((i) => i.replace(/\[.+\]/, "").trim());
      if (target.length > 1) console.log("fuzzy: multiple target found", target);
      return target;
    };

    if (argv.a) return console.log(services.filter((item) => item.indexOf("[ + ]") > -1));
    if (argv.i) return console.log(services.filter((item) => item.indexOf("[ - ]") > -1));
    if (argv.n) return cmd(`service ${fuzzy(argv.n)[0]} status`);

    if (argv.e) {
      let target = fuzzy(argv.e)[0];
      return cmdq({ ["enable service: " + target + "(y/N)"]: false }).then((ans) => {
        if (ans[0] === "y") cmd("sudo systemctl enable " + target);
        cmd(`service ${target} status`);
      });
    }

    if (argv.d) {
      let target = fuzzy(argv.d)[0];
      return cmdq({ ["disable service: " + target + "(y/N)"]: false }).then((ans) => {
        if (ans[0] === "y") cmd("sudo systemctl disable " + target, true);
        cmd(`service ${target} status`);
      });
    }

    cmd(`service --status-all`);
  });

new ucmd("hash", "target")
  .describer({ main: "hash the following string", options: [{ arg: "s", describe: "string of target" }] })
  .perform((argv) => {
    if (argv.s) return cmd(`echo -n ${argv.s} | md5sum`);
  });

new ucmd("docker")
  .describer({
    main: "docker additional command",
    options: [
      { arg: "c", describe: "clean <none> images", boolean: true },
      { arg: "i", describe: "images display", boolean: true },
      { arg: "p", describe: "process list AKA containter", boolean: true },
      { arg: "a", describe: "all display", boolean: true },
      { arg: "s", describe: "stop" },
      { arg: "l", describe: "logs" },
      { arg: "n", describe: "network status" },
      { arg: "r", describe: "stop container and remove corresponding volume" },
    ],
  })
  .perform((argv) => {
    if (argv.c) cmd("sudo docker system prune --volumes");
    if (argv.i) cmd("sudo docker images" + (argv.a ? " -a" : ""));
    if (argv.p) cmd("sudo docker ps" + (argv.a ? " -a" : ""));
    if (argv.r) cmd(`sudo docker container stop ${argv.r} && sudo docker container rm ${argv.r}`);
    if (argv.s) cmd(`sudo docker container stop ${argv.s}`);
    if (argv.l) cmd(`sudo docker logs ${argv.l}`);
    if (argv.n) argv.n === true ? cmd("sudo docker network ls") : cmd("sudo docker network inspect " + argv.n);
  });

new ucmd("dc")
  .describer({
    main: "docker-compose command",
    options: [
      { arg: "u", describe: "up, detached mode", boolean: true },
      { arg: "d", describe: "down, and remove orphan", boolean: true },
      { arg: "i", describe: "images display", boolean: true },
      { arg: "p", describe: "process list AKA containter", boolean: true },
      { arg: "a", describe: "all display", boolean: true },
      { arg: "r", describe: "stop container and remove corresponding volume", boolean: true },
    ],
  })
  .perform((argv) => {
    if (argv.u) return cmd("sudo docker-compose up -d");
    if (argv.d) return cmd("sudo docker-compose down --remove-orphans");
    if (argv.i) return cmd("sudo docker-compose images");
    if (argv.p) return cmd("sudo docker-compose ps" + (argv.a ? " -a" : ""));
    if (argv.r) return cmd("sudo docker-compose rm -s");
  });

new ucmd("post", "url", "data")
  .describer({
    main: "send post request",
    options: [
      { arg: "u", describe: "url" },
      { arg: "d", describe: "json data", default: "{}" },
    ],
  })
  .perform((argv) => {
    if (argv.u.indexOf("http") < 0) argv.u = "http://" + argv.u;
    return cmd(
      `curl -X POST -H "Content-Type: application/json" -d '${JSON.stringify(eval("(" + argv.d + ")"))}' ${argv.u}`,
      true
    );
  });

new ucmd("helper")
  .describer({
    main: "helper for other commands",
    options: [
      { arg: "n", describe: "name" },
      { arg: "e", describe: "edit with code", boolean: true },
      { arg: "s", describe: "software needs to be preinstalled" },
    ],
  })
  .perform((argv) => {
    if (argv.e) return cmd("code ~/Documents/ucmd");
    if (argv.s)
      return console.log({
        yum: "epel-release",
        ubuntu: "",
        common: "sudo psmisc net-tools nethogs openssh-server openssh-clients cronie curl ",
        optional: "docker",
        prescript: `if ! [ -f "$HOME/.bash_mine" ]; then
        touch $HOME/.bash_mine
        mkdir $HOME/.npm_global
        mkdir $HOME/.application
        echo 'source $HOME/.bash_mine' >> $HOME/.bashrc
        echo 'if [ "$PWD" = "$HOME" ]; then cd Documents; fi;' >> $HOME/.bash_mine
        echo 'PATH=$HOME/.npm_global/bin/:$PATH' >> $HOME/.bash_mine
        npm config set prefix $HOME/.npm_global
        source $HOME/.bashrc
    
        git config --global alias.adog "log --all --decorate --oneline --graph"
    fi`,
      });
    let list = {
      screen: {
        "run in detached mode": "screen -dmS $name $cmd",
        "kill session": "ctrl + a + k",
        "show list of screens": "ls -laR /var/run/screen/",
      },
      git: {
        "branch create": "git branch $name",
        "branch ls": "git branch",
        "branch remove": "git branch -d $name",
        "graph adog": "git log --all --decorate --oneline --graph",
        "pull on target directory": "git -C $location pull",
        "first time config": "git config --global user.name $name && git config --global user.email $email",
      },
      crontab: {
        edit: "sudo crontab -e",
        "run command on reboot": "@reboot CMD",
        "At every 5th minute": "*/5 * * * *",
        "day 1, 3, 4, 5": "0 0 1,3-5 * *",
        order: "min (0 - 59) | hour (0 - 23) | day of month (1 - 31) | month (1 - 12) | day of week (0 - 6)",
        output: "location: /var/log/syslog",
      },
      grep: {
        or: "pattern1\\|pattern2",
      },
      redis: {
        "get all keys": "keys *",
        "get expire time": "ttl KEY",
      },
      apt: {
        "remove unnecessary ppa": "cd /etc/apt/sources.list.d",
        "list installed": "sudo apt list --installed",
      },
      network: {
        "edit network config": "sudo nano /etc/network/interfaces",
        "interfaces example":
          "iface $name inet static:\n\tnetmask 255.255.255.0\n\tgateway 192.168.x.1\n\taddress 192.168.x.x",
        "restart network": "sudo service network-manager restart",
      },
      scp: {
        download: "scp user@remote_host:remote_file local_file",
        upload: "scp local_file user@remote_host:remote_file",
      },
    };
    if (argv.n) console.log(JSON.stringify(list[argv.n], undefined, "\t"));
    else console.log(JSON.stringify(list, undefined, "\t"));
  });

new ucmd().run();
