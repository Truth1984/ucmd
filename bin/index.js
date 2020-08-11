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
var mp = require("pollute");
var shellParser = require("../helper/shell-parser");
var iniParser = require("ini");
let random = () => Math.floor(Math.random() * 10000).toString();
require("./test");

let ost = () => {
  if (fs.existsSync("/etc/debian_version")) return "apt";
  if (fs.existsSync("/etc/redhat-release")) return "yum";
};

let parseJson = (string, tostring = true) => {
  if (tostring) return JSON.stringify(eval("(" + string + ")"));
  return eval("(" + string + ")");
};

let fileExistProcess = (file) => {
  file = file.replace("~", process.env.HOME);
  if (!fs.existsSync(file)) {
    console.log("error:", file, "does not exist");
    process.exit(1);
  }
  return file;
};

let getTime = () => {
  let dobj = new Date();
  return {
    year: dobj.getFullYear(),
    month: dobj.getMonth() + 1,
    day: dobj.getDate(),
    hour: dobj.getHours(),
    minute: dobj.getMinutes(),
    second: dobj.getSeconds(),
  };
};

new ucmd("port", "portnum")
  .describer({
    main: "scan for a specific port",
    options: [
      { arg: "p", describe: "port number or process name" },
      { arg: "d", describe: "docker container port" },
    ],
  })
  .perform((argv) => {
    if (os.platform() == "win32") {
      if (!argv.p) return cmd("netstat -bn");
      return cmd("netstat -bn | grep " + argv.p);
    }
    //
    if (argv.d) {
      if (argv.d == true) return cmd(`sudo docker ps --format "{{.Ports}}\t:\t{{.Image}}"`);
      else return cmd(`sudo docker ps | grep  ${argv.d}`);
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
    if (argv.d) argv.l = paths.join("~/Documents/", argv.l);
    if (process.platform == "darwin") cmd(`open ${argv.l}`);
    if (process.platform == "linux") cmd(`xdg-open ${argv.l}`);
  });

new ucmd("download", "url", "filename")
  .describer({
    main: "download the file into ~/Download folder",
    options: [
      { arg: "u", describe: "url or m3u8" },
      { arg: "f", describe: "filename or location" },
      { arg: "a", describe: "absolute, else it will be in ~/Downloads folder", boolean: true },
      { arg: "w", describe: "use wget module", boolean: true },
    ],
  })
  .perform((argv) => {
    let filename = argv.f;
    if (!argv.a) filename = os.homedir + "/Downloads/" + filename;
    let url = argv.u;
    if (argv.w) return cmd(`sudo wget -o ${argv.filename} ${url}`);
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
      { arg: "i", describe: "Ignore directory like ['!.git'], Include like ['*.js']", default: [] },
      { arg: "d", describe: "directory only", boolean: true },
      { arg: "f", describe: "file only", boolean: true },
      { arg: "s", describe: "subdirectory depth", default: 2 },
    ],
  })
  .perform(async (argv) => {
    if (!argv.b) argv.b = process.cwd();
    let target = argv.t;
    let basedir = argv.b;
    let ignores = argv.i;
    let directoryOnly = argv.d;
    let fileOnly = argv.f;
    let depth = argv.s;

    let nameArr = await read.promise(basedir, { type: "files_directories", depth, directoryFilter: ignores });

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
      { arg: "f", describe: "file information" },
      { arg: "d", describe: "directory information", boolean: true },
      { arg: "h", describe: "hardware information", boolean: true },
      { arg: "l", describe: "large file on this directory" },
    ],
  })
  .perform((argv) => {
    if (argv.f) return cmd("stat " + argv.f);
    if (argv.d) return cmd("ls -alF");
    if (argv.h) return cmd("df -h");
    if (argv.l) return cmd("du -ahx . | sort -rh | head -" + u.int(argv.l) ? argv.l : 20);
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
    options: [
      { arg: "n", describe: "name to grep" },
      { arg: "f", describe: "full command display", boolean: true },
      { arg: "K", describe: "kill relevant process" },
    ],
  })
  .perform((argv) => {
    let base = "ps -aux";
    if (argv.f) base += "wwf";
    if (argv.n) return cmd(base + " | grep " + argv.n);
    if (argv.K) {
      let result = cmd(`ps -ae | { head -1; grep ${argv.K}; }`, false, true);
      return shellParser(result).map((item) => cmd(`kill ${item.PID}`));
    }
    return cmd(base);
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
      { arg: "r", describe: "remove gitwatch config", boolean: true },
    ],
  })
  .perform((argv) => {
    if (!argv.l) return console.log("location not specified");
    cmd("mkdir -p $UDATA/log");
    cmd("mkdir -p $UDATA/gitwatch");
    cmd("mkdir -p $UDATA/cron");
    argv.l = argv.l.replace("~", process.env.HOME);
    let stored = "$UDATA/cron/cronfile";
    let content = cmd("crontab -l ", false, true);
    let screenName = "gitwatch_" + paths.basename(argv.l);
    let scriptLocation = "$UDATA/gitwatch/gitwatch_" + paths.basename(argv.l) + ".sh";

    if (argv.r) {
      cmd(`rm ${scriptLocation}`);
      cmd(`screen -X -S ${screenName} quit`);
      content = content
        .split("\n")
        .filter((c) => c.indexOf(scriptLocation) == -1)
        .join("\n");
      fs.writeFileSync(stored, content);
      return cmd("crontab " + stored);
    }

    if (content.indexOf(screenName) > -1) return console.log(screenName, "already exist, modify by using crontab -e");

    cmd(`touch ${scriptLocation} && chmod 777 ${scriptLocation}`);
    let scriptContent = `cd ${argv.l}
var=$(git pull origin ${argv.b} 2>&1)
if echo $var | grep -q "changed"; then
    echo $(date) >> $UDATA/log/gitwatch_${paths.basename(argv.l)}.log
    echo $var >> $UDATA/log/gitwatch_${paths.basename(argv.l)}.log
fi;
echo $var;
`;
    let screencmd = `screen -dmS ${screenName} watch -n ${argv.i} "sh ${scriptLocation}"`;
    fs.writeFileSync(scriptLocation, scriptContent);
    fs.writeFileSync(stored, content + `\n@reboot ${screencmd} \n`);
    cmd(screencmd);
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

new ucmd("lock", "file")
  .describer({
    main: "prevent file from overwritten",
    options: [
      { arg: "f", describe: "filename to lock" },
      { arg: "u", describe: "unlock file" },
    ],
  })
  .perform((argv) => {
    if (argv.f) return cmd("sudo chattr +i " + argv.f);
    if (argv.u) return cmd("sudo chattr -i " + argv.u);
  });

new ucmd("saveop", "cmd", "fileLocation")
  .describer({
    main: "save the out put of a command to the file",
    options: [
      { arg: "c", describe: "command to save the output" },
      { arg: "f", describe: "file for saving the output", default: "$UDATA/u_saveop_tmp.log" },
      { arg: "a", describe: "appendable", boolean: true },
      { arg: "e", describe: "echo result from saveoptmp.log", boolean: true },
    ],
  })
  .perform((argv) => {
    console.log(argv.f);
    if (argv.c) return cmd(`${argv.c} 2>&1 | tee ${argv.a ? "-a" : ""} ${argv.f}`);
    if (argv.e) return cmd(`cat ${argv.f}`);
  });

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
    let fuzzy = (name) => {
      let jsonresult = cmd(`u json -j "systemctl list-units --type service -a | cat"`, false, true);
      let services = JSON.parse(jsonresult)
        .filter((i) => i != null)
        .map((i) => i.UNIT);
      let target = services.filter((item) => item.indexOf(name) > -1).map((i) => i.replace(/\[.+\]/, "").trim());
      if (target.length > 1) console.log("fuzzy: multiple target found", target);
      return target;
    };

    if (argv.a) return cmd(`systemctl list-units --type service -a | grep active`);
    if (argv.i) return cmd(`systemctl list-units --type service -a | grep inactive`);
    if (argv.n) return cmd(`systemctl status ${fuzzy(argv.n)[0]}`);

    if (argv.e) {
      let target = fuzzy(argv.e)[0];
      return cmdq({ ["enable service: " + target + "(y/N)"]: false }).then((ans) => {
        if (ans[0] === "y") cmd(`sudo systemctl enable ${target} && sudo systemctl start ${target}`, true);
        cmd(`service ${target} status`);
      });
    }

    if (argv.d) {
      let target = fuzzy(argv.d)[0];
      return cmdq({ ["disable service: " + target + "(y/N)"]: false }).then((ans) => {
        if (ans[0] === "y") cmd(`sudo systemctl disable ${target} && sudo systemctl stop ${target}`, true);
        cmd(`service ${target} status`);
      });
    }

    cmd(`systemctl list-units --type service --all`);
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
      { arg: "b", describe: "build dockerfile with result name, can be [targetName, sourcefile]" },
      { arg: "o", describe: "docker find port" },
      { arg: "s", describe: "stop" },
      { arg: "l", describe: "logs path of container" },
      { arg: "L", describe: "live log" },
      { arg: "n", describe: "network status" },
      { arg: "r", describe: "remove container" },
      { arg: "R", describe: "remove container and its volume" },
      { arg: "e", describe: "execute with bash" },
    ],
  })
  .perform((argv) => {
    if (argv.c) cmd("sudo docker system prune --volumes");
    if (argv.i) cmd("sudo docker images" + (argv.a ? " -a" : ""));
    if (argv.p) cmd("sudo docker ps" + (argv.a ? " -a" : ""));
    if (argv.p) cmd("sudo docker ps | grep " + argv.p);
    if (argv.r) cmd(`sudo docker container stop ${argv.r} && sudo docker container rm ${argv.r}`);
    if (argv.s) cmd(`sudo docker container stop ${argv.s}`);
    if (argv.l) cmd(`sudo docker inspect --format={{.LogPath}} ${argv.l}`);
    if (argv.L) cmd(`sudo docker logs -f ${argv.L}`);
    if (argv.e)
      cmd(`sudo docker $(sudo docker ps | grep -q ${argv.e} && echo "exec" || echo "run") -it ${argv.e} bash`);
    if (argv.b) {
      if (argv.b.indexOf("[") == -1) argv.b = [argv.b];
      else argv.b = JSON.parse(argv.b);
      let sentence = `sudo docker image build -t ${argv.b[0]} ${argv.b[1] ? "-f " + argv.b[1] : ""}  . `;
      cmd(sentence);
    }
    if (argv.R) {
      let target = JSON.parse(cmd(`sudo docker inspect ${argv.R}`, false, true));
      cmd(`sudo docker container stop ${argv.R} && sudo docker container rm ${argv.R}`);
      let mounts = target[0]["Mounts"];
      let qs = (volume) =>
        cmdq({ ["remove volume" + volume + " (N)"]: false }).then((result) => {
          if (result.toLowerCase() == "y") cmd(`sudo rm -rf ${volume}`);
        });
      if (mounts != undefined) for (let i of mounts) qs(i["Source"]);
    }
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
      { arg: "L", describe: "live log", default: "" },
      { arg: "l", describe: "logs service", default: "" },
    ],
  })
  .perform((argv) => {
    if (argv.u) return cmd("sudo docker-compose up -d");
    if (argv.d) return cmd("sudo docker-compose down --remove-orphans");
    if (argv.i) return cmd("sudo docker-compose images");
    if (argv.p) return cmd("sudo docker-compose ps" + (argv.a ? " -a" : ""));
    if (argv.r) return cmd("sudo docker-compose rm -s");
    if (argv.l) return cmd("sudo docker-compose logs " + argv.l);
    if (argv.L) return cmd(`sudo docker-compose logs -f ${argv.L}`);
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
    cmd(
      `curl -X POST -A "Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:59.0) Gecko/20100101 Firefox/59.0" -H "Content-Type: application/json" -d '${parseJson(
        argv.d
      )}' ${argv.u}`,
      true
    );
    console.log("");
  });

new ucmd("iptable")
  .describer({
    main: "iptable controller",
    options: [
      { arg: "p", describe: "process list", boolean: true },
      { arg: "s", describe: "save iptable backup" },
      { arg: "b", describe: "block ip address, can be xxx.xxx.xxx.0/24" },
      { arg: "u", describe: "unblock ip address", boolean: true },
      { arg: "S", describe: "secure setup for internet interface" },
    ],
  })
  .perform((argv) => {
    // iptables is not quiet useful if all the connections have docker network proxy
    if (argv.p) return cmd("sudo iptables -L -v");

    if (argv.s) {
      let ctime = getTime();
      //sudo iptables-restore < /tmp/iptables_backup
      return cmd(
        `sudo iptables-save > /tmp/iptables_backup_${ctime.year}${ctime.month}${ctime.day}${ctime.hour}${ctime.minute}`
      );
    }

    //block ssh
    //sudo iptables -A INPUT -p tcp -s xxx.xxx.xxx.0/24 --dport 22 -j DROP

    if (argv.b)
      // -I INPUT to put rules at the beginning
      return cmd(
        `sudo iptables -A INPUT -p all -s ${argv.b} -j DROP && sudo iptables -A OUTPUT -p all -s ${argv.b} -j DROP`
      );

    if (argv.u)
      return cmd(
        `sudo iptables -D INPUT -p all -s ${argv.u} -j DROP && sudo iptables -D OUTPUT -p all -s ${argv.u} -j DROP`
      );

    if (argv.S) {
      if (argv.S == true) return console.log("internet interface not specified");
      //portscan
      return cmd(`sudo iptables -N LOGPSCAN
      sudo iptables -A LOGPSCAN -p tcp --syn -m limit --limit 2000/hour -j RETURN
      sudo iptables -A LOGPSCAN -m limit --limit 99/hour -j LOG --log-prefix "DROPPED Port scan: "
      sudo iptables -A LOGPSCAN -j DROP
      sudo iptables -A INPUT -p tcp --syn -j LOGPSCAN`);
    }
  });

new ucmd("replace", "filename", "old", "new")
  .describer({
    main: "replace a string in the file",
    options: [
      { arg: "f", describe: "filename" },
      { arg: "o", describe: "old string" },
      { arg: "n", describe: "new string" },
      { arg: "g", describe: "global /g", boolean: true },
      { arg: "t", describe: "test the result", boolean: true },
      { arg: "d", describe: "self defined delimiter", default: "/" },
    ],
  })
  .perform((argv) => {
    if (!argv.f || !argv.o || !argv.n) return console.log("missing parameters, file - old - new");
    let delimiterArr = ["@", "#", "&", "%", "|", "^", "(", "-", "=", "+", "[", "{", ":", "_", "<", "~", "*", "\\"];
    let dlm;
    for (let i of [argv.d, ...delimiterArr]) {
      if (argv.o.indexOf(i) == -1 && argv.n.indexOf(i) == -1) {
        dlm = i;
        break;
      }
    }
    if (dlm == undefined) return console.log("delimiter can't be used");
    let line = `sudo sed ${argv.t ? "" : "-i"} 's${dlm}${argv.o}${dlm}${argv.n}${dlm}${argv.g ? dlm + "g" : ""}' ${
      argv.f
    }`;
    cmd(line);
  });

new ucmd("pkgjson", "name", "script")
  .describer({
    main: "package json modifier",
    options: [
      { arg: "n", describe: "name of the script" },
      { arg: "s", describe: "script to add or replace" },
      { arg: "l", describe: "list all the commands", boolean: true },
    ],
  })
  .perform((argv) => {
    let path = "package.json";
    if (!fs.existsSync(path)) path = "../package.json";
    if (!fs.existsSync(path)) return console.error("Error: package.json file does not exist");
    let data = JSON.parse(fs.readFileSync(path).toString());
    if (argv.l) return console.log(data["scripts"]);
    if (argv.s == undefined) return console.log(data["scripts"][argv.s]);
    data["scripts"][argv.n] = argv.s;
    fs.writeFileSync(path, JSON.stringify(data, undefined, "  "));
  });

new ucmd("json", "cmd")
  .describer({
    main: "parse result to json",
    options: [
      { arg: "c", describe: "command result to json" },
      { arg: "s", describe: "separator of the result", default: " " },
      { arg: "l", describe: "line to skip", default: 0 },
      { arg: "j", describe: "Json stringify the result", boolean: true },
    ],
  })
  .perform((argv) => {
    let result = shellParser(cmd(argv.c, false, true), { separator: argv.s, skipLines: argv.l });
    if (argv.j) console.log(JSON.stringify(result));
    else console.log(result);
  });

new ucmd("backup", "file")
  .describer({
    main: "backup a file to normal backup folder",
    options: [{ arg: "f", describe: "file location" }],
  })
  .perform((argv) => {
    argv.f = fileExistProcess(argv.f);
    let time = getTime();
    let filename = paths.basename(argv.f) + [time.year, time.month, time.day, time.hour, time.minute].join("-");
    return cmd(`cp ${argv.f} $UDATA/backup/${filename} && echo "${filename} > ${argv.f}" >> $UDATA/backup/readme.md`);
  });

new ucmd("ini", "file")
  .describer({
    main: "parse ini file to json and vice-versa",
    options: [
      { arg: "f", describe: "file location to workwith" },
      { arg: "j", describe: "json data to merge with" },
      { arg: "i", describe: "insert json into category" },
      { arg: "p", describe: "print json result", boolean: true },
      { arg: "b", describe: "backup file", boolean: true },
    ],
  })
  .perform((argv) => {
    argv.f = fileExistProcess(argv.f);
    cmd(`sudo chmod 777 ${argv.f}`);
    if (argv.p) console.log(iniParser.parse(fs.readFileSync(argv.f).toString()));
    if (argv.b) cmd(`u backup ${argv.f}`);
    let objectify = () => iniParser.parse(fs.readFileSync(argv.f).toString());
    let towrite = (content) => fs.writeFileSync(argv.f, iniParser.encode(content), { flag: "w+" });
    if (argv.j) return towrite(Object.assign(objectify(), parseJson(argv.j, false)));
    if (argv.i) {
      let data = objectify();
      let input = parseJson(argv.i, false);
      for (let i of Object.keys(input)) {
        if (!data[i]) data[i] = {};
        if (typeof data[i] == "object") {
          for (let j of Object.keys(input[i])) data[i][j] = input[i][j];
        } else {
          data[i] = input[i];
        }
      }
      return towrite(data);
    }
  });

new ucmd("usermod", "group", "user")
  .describer({
    main: "use usermod to assign privilege to particular user, take effect after reboot",
    options: [
      { arg: "g", describe: "group to modify" },
      { arg: "u", describe: "user to modify", default: process.env.USER },
      { arg: "i", describe: "insert, add to group" },
      { arg: "r", describe: "remove user from user group" },
      { arg: "G", describe: "group lists", boolean: true },
      { arg: "D", describe: "add current user to docker group", boolean: true },
    ],
  })
  .perform((argv) => {
    if (argv.G) return cmd(`getent group`);
    if (argv.D)
      return cmd(
        `sudo usermod -aG docker ${argv.u} && sudo chown "${argv.u}":"${argv.u}" /home/"${argv.u}"/.docker -R`
      );
    if (argv.g == undefined) return console.log("group undefined");
    if (argv.i) return cmd(`sudo usermod -aG ${argv.g} ${argv.u}`, true);
    if (argv.r) return cmd(`sudo gpasswd -d ${argv.u} ${argv.g}`, true);
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
        common: "psmisc net-tools nethogs openssh-server openssh-clients cronie ",
        prescript: `wget -O - https://truth1984.github.io/testSites/s/prescript.sh | bash`,
        tools: `wget -O - https://truth1984.github.io/testSites/s/tools.sh | bash`,
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
        regex: `grep -P "\\d"`,
        quiet: "grep -q",
      },
      redis: {
        authorization: "AUTH $pass",
        "get all keys": "keys *",
        "get expire time": "ttl KEY",
      },
      apt: {
        "remove unnecessary ppa": "cd /etc/apt/sources.list.d",
        "list installed": "sudo apt list --installed",
      },
      yum: {
        "list installed": "yum list installed",
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
      bash: {
        scriptDir: 'DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"',
        disableService: "systemctl disable $SERVICENAME",
        shEcho: "sh -c 'echo 0'",
        mkdir: "mkdir -p",
        fullOutput: "2>&1",
      },
    };
    if (argv.n) console.log(list[argv.n]);
    else console.log(list);
  });

new ucmd().run();
