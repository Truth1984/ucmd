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
var shellParser = require("../helper/shell-parser");
var iniParser = require("ini");
var yamlParser = require("yamljs");
var u = require("awadau");
var multiSelect = require("../helper/multiSelect");
require("./test");

let parseJson = (string, tostring = true) => {
  if (tostring) return JSON.stringify(eval("(" + string + ")"));
  return eval("(" + string + ")");
};

/**
 * return file path
 */
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

let checkOS = (name) => {
  return cmd(`u os ${name}`, false, true).trim() == "true";
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

new ucmd("ip").describer({ main: "find local ip adress" }).perform(() => cmd("ifconfig | grep inet", true));

new ucmd("network", "device")
  .describer({
    main: "display live network",
    options: [
      { arg: "d", describe: "device for showing network details" },
      { arg: "t", describe: "tcp connection status" },
      { arg: "l", describe: "list the network", boolean: true },
    ],
  })
  .perform((argv) => {
    if (argv.l) return cmd("sudo netstat -i");
    if (argv.t) {
      if (argv.d) return cmd(`sudo tcpdump -i ${argv.d}`);
      return cmd(`sudo tcpdump`);
    }
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
    if (process.platform == "win32") cmd(`start ${argv.l}`);
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
      { arg: "i", describe: "Ignore directory like ['!log'], Include like ['*_log']", default: ["!.git", "!*modules"] },
      { arg: "I", describe: "Ignore files like ['!.git'], Include like ['*.js']" },
      { arg: "a", describe: "output result as an array", boolean: true },
      { arg: "d", describe: "directory only", boolean: true },
      { arg: "f", describe: "file only", boolean: true },
      { arg: "D", describe: "subdirectory Depth", default: 3 },
      {
        arg: "T",
        describe:
          "stat file condition with js, {mtime: content, ctime: content + location or permission, atime: access, readtime} \
        like: 'u.timeAdd({day:-1}) < mtime && u.timeAdd({day:-3}) > atime'",
      },
      { arg: "c", describe: "command operation to perform, replace dir with $1" },
    ],
  })
  .perform(async (argv) => {
    if (!argv.b) argv.b = process.cwd();
    let target = argv.t;
    let basedir = argv.b;
    let ignores = argv.i;
    let fileIgnores = argv.I;
    let directoryOnly = argv.d;
    let fileOnly = argv.f;
    let depth = argv.D;

    let options = {
      type: "files_directories",
      depth,
      directoryFilter: ignores,
    };

    if (argv.I) options = u.mapMerge(options, { fileFilter: fileIgnores });
    let nameArr = await read.promise(basedir, options);

    let result = [];

    if (!directoryOnly && !fileOnly) {
      for (let i of nameArr) if (u.contains(i.basename, target)) result.push(i);
    } else {
      for (let i of nameArr)
        if (u.stringToRegex(target).test(i.basename) && (i.dirent.isDirectory() ? directoryOnly : fileOnly))
          result.push(i);
    }

    if (argv.T) {
      result = result.filter((i) => {
        // eslint-disable-next-line no-unused-vars
        let { atime, ctime, mtime } = fs.lstatSync(i.fullPath);
        return eval(argv.T);
      });
    }

    if (argv.o) {
      return result.map((i) => cmd(u.stringReplace(argv.o, { "\\$1": i.fullPath }), true));
    }

    if (argv.a) console.log(result.map((i) => i.fullPath));
    else console.log(result);
  });

new ucmd("sysinfo", "target")
  .describer({
    main: "display system information",
    options: [
      { arg: "t", describe: "target", default: "." },
      { arg: "s", describe: "size of file" },
      { arg: "h", describe: "hardware information", boolean: true },
      { arg: "l", describe: "large file on this directory" },
    ],
  })
  .perform((argv) => {
    if (argv.s) return cmd(`du -sh ${argv.s}`);
    if (argv.h) return cmd("df -Th");
    if (argv.l) return cmd("du -ahx . | sort -rh | head -n " + (Number.isNaN(Number.parseInt(argv.l)) ? 20 : argv.l));
    if (fs.lstatSync(argv.t).isDirectory()) return cmd(`cd ${argv.t} && ls -alFh`);
    else return cmd(`stat ${argv.f}`);
  });

new ucmd("mount", "target")
  .describer({
    main: "mount or unmount a device, use `mkfs.ext4 /dev/target` to change type",
    options: [
      { arg: "m", describe: "mount target" },
      { arg: "u", describe: "unmount target" },
      { arg: "i", describe: "information of mounting" },
      { arg: "I", describe: "unmounted information" },
    ],
  })
  .perform((argv) => {
    let findUnmount = () => {
      let list = cmd(`lsblk --noheadings --raw -o NAME,MOUNTPOINT | awk '$1~/[[:digit:]]/ && $2 == ""'`, false, true);
      return u
        .stringToArray(list, "\n")
        .map((i) => i.trim())
        .filter((i) => i != "");
    };
    if (argv.m) return cmd(`udisksctl mount -b ${argv.m}`, true);
    if (argv.u) return cmd(`udisksctl unmount -b ${argv.u}`, true);

    if (argv.i && argv.i != true) return cmd(`sudo fdisk -l ${argv.i}`);
    if (argv.i)
      cmd(
        `sudo fdisk -l && df -Th && echo -e "\nunmounted:" && lsblk --noheadings --raw -o NAME,MOUNTPOINT | awk '$1~/[[:digit:]]/ && $2 == ""'`
      );
    if (argv.I) {
      let list = findUnmount();
      if (u.len(list) == 0) return console.log("there is no unmounted device");
      for (let i of list) cmd(`stat /dev/${i}`);
    }
  });

new ucmd("ssh", "address")
  .describer({
    main: "use keygen to generate key pairs",
    options: [
      { arg: "a", describe: "address, like root@localhost:22" },
      { arg: "n", describe: "name of alias" },
      { arg: "r", describe: "refresh keygen token", boolean: true },
    ],
  })
  .perform((argv) => {
    let keygen = "ssh-keygen -t rsa -b 4096";
    if (argv.r) cmd(keygen);
    cmd(`if ! [ -f $HOME/.ssh/id_rsa ]; then ${keygen}; fi;`);

    let name = "root";
    let addr = "";
    let port = 22;
    if (u.contains(argv.a, "@") && u.contains(argv.a, ":")) {
      name = u.refind(argv.a, u.regexBetweenOut("^", "@"));
      addr = u.refind(argv.a, u.regexBetweenOut("@", ":"));
      port = u.refind(argv.a, u.regexBetweenOut(":", "$"));
    } else if (u.contains(argv.a, "@")) {
      name = u.refind(argv.a, u.regexBetweenOut("^", "@"));
      addr = u.refind(argv.a, u.regexBetweenOut("@", "$"));
    } else if (u.contains(argv.a, ":")) {
      addr = u.refind(argv.a, u.regexBetweenOut("^", ":"));
      port = u.refind(argv.a, u.regexBetweenOut(":", "$"));
    } else {
      addr = argv.a;
    }

    cmd(`ssh-copy-id -i ~/.ssh/id_rsa.pub -p ${port} ${name}@${addr}`);
    if (argv.n) cmd(`u quick ssh${argv.n} "ssh -p ${port} ${name}@${addr}"`);
  });

new ucmd("process", "name")
  .describer({
    main: "show list of current process",
    options: [
      { arg: "n", describe: "name to grep" },
      { arg: "f", describe: "full command display", boolean: true },
      { arg: "s", describe: "sorted ps command by cpu first, get first 10", boolean: true },
      { arg: "S", describe: "sorted ps command by memory first, get first 10", boolean: true },
      { arg: "K", describe: "kill relevant process" },
      { arg: "d", describe: "directory of running process, require pid" },
    ],
  })
  .perform((argv) => {
    let base = "ps -aux";
    if (argv.f) base += "wwf";
    if (argv.n) return cmd(base + " | grep " + argv.n);
    if (argv.s) return cmd("ps auxk -%cpu,%mem | head -n10");
    if (argv.S) return cmd("ps auxk -%mem,%cpu | head -n10");
    if (argv.K) {
      let result = cmd(`ps -ae | { head -1; grep ${argv.K}; }`, false, true);
      return shellParser(result).map((item) => cmd(`kill ${item.PID}`));
    }
    if (argv.d) return cmd(`sudo pwdx ${argv.d}`);
    return cmd(base);
  });

new ucmd("gitclone", "name", "user")
  .describer({
    main: "git clone into current folder",
    options: [
      { arg: "n", describe: "name of the project" },
      { arg: "u", describe: "username", default: "Truth1984" },
      { arg: "D", describe: "dockerize node project", boolean: true },
      { arg: "d", describe: "destination of download" },
      { arg: "i", describe: "initialize for js project" },
    ],
  })
  .perform((argv) => {
    if (argv.i) {
      if (!fs.existsSync(".git")) return console.log("Error: git folder not found");

      return cmd(`cp -a $DIR/gitfile/. ./`);
    }

    if (argv.D) {
      if (!fs.existsSync("package.json")) return console.log("Error: package.json not found");
      return cmd(`bash <(curl -s https://truth1984.github.io/testSites/node/prep.sh)`);
    }
    let user = argv.u;
    let project = argv.n;
    let dest = argv.d ? argv.d : `~/Documents/${project}`;
    cmd(`git clone https://github.com/${user}/${project}.git ${dest}`);
  });

new ucmd("gitwatch", "location", "branchName", "interval")
  .describer({
    main: "DEPRECATED, USE JENKINS INSTEAD, watch file changes, auto pull every X seconds, require git, crontab, watch",
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

new ucmd("screen", "cmd", "name")
  .describer({
    main: "start a screen command, use ctl+a+[ to enable scroll back mode",
    options: [
      { arg: "c", describe: "command to run in screen" },
      { arg: "n", describe: "name of the command" },
      { arg: "r", describe: "reattach to pid" },
      { arg: "k", describe: "kill target screen process" },
      { arg: "l", describe: "show list of screen", boolean: true },
    ],
  })
  .perform((argv) => {
    if (argv.c) {
      if (argv.n) return cmd(`sudo screen -dmS ${argv.n} ${argv.c}`);
      return cmd(`sudo screen -dm bash -c ${argv.c}`);
    }
    if (argv.r) return cmd(`sudo screen -r ${argv.r === true ? "" : argv.r}`);
    if (argv.k) return cmd(`sudo screen -X -S ${argv.k} quit`);
    if (argv.l) return cmd("sudo screen -list");
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
      { arg: "e", describe: "enable a service, and start" },
      { arg: "d", describe: "disable a service" },
      { arg: "r", describe: "restart service" },
      { arg: "A", describe: "absolute name, skip name filtering", boolean: true },
      { arg: "a", describe: "active process", boolean: true },
      { arg: "i", describe: "inactive process", boolean: true },
    ],
  })
  .perform(async (argv) => {
    let fuzzy = (name, quitOnUdf = true) => {
      if (argv.A) return name;
      let jsonresult = cmd(`u json -j "systemctl list-units --type service -a | cat"`, false, true);
      let services = u
        .stringToJson(jsonresult)
        .filter((i) => i != null)
        .map((i) => i.UNIT);
      let target = services
        .filter((item) => item.indexOf(name) > -1)
        .map((i) => u.refind(i, /[\d\w].+/).trim())
        .sort((a, b) => a.length - b.length);
      return multiSelect(target, undefined, undefined, quitOnUdf);
    };

    if (argv.a) return cmd(`sudo systemctl list-units --type service -a --state=active`);
    if (argv.i) return cmd(`sudo systemctl list-units --type service -a --state=inactive`);
    let program = await fuzzy(argv.n);
    if (u.len(program) == 0) program = argv.n;
    if (argv.n) return cmd(`sudo systemctl status ${program}`);

    if (argv.e) {
      let target = await fuzzy(argv.e, false);
      if (target.length == 0) target = argv.e;
      cmd(`sudo systemctl start ${target} && sudo systemctl enable ${target}`, true);
      if (argv.A) return;
      return cmd(`sudo service ${target} status`);
    }

    if (argv.d) {
      let target = await fuzzy(argv.d);
      return cmdq({ ["disable service: " + target + "(y/N)"]: false }).then((ans) => {
        if (ans[0] === "y") cmd(`sudo systemctl disable ${target} && sudo systemctl stop ${target}`, true);
        if (argv.A) return;
        cmd(`sudo service ${target} status`);
      });
    }

    if (argv.r) return cmd(`sudo systemctl restart ${await fuzzy(argv.r)}`);
    cmd(`sudo systemctl list-units --type service --all`);
  });

new ucmd("hash", "target")
  .describer({ main: "hash the following string", options: [{ arg: "s", describe: "string of target" }] })
  .perform((argv) => {
    if (argv.s) return cmd(`echo -n ${argv.s} | md5sum`);
  });

new ucmd("retry", "cmd")
  .describer({
    main: "retry the command if failed",
    options: [
      { arg: "c", describe: "command" },
      { arg: "t", describe: "times to repeat", default: 3 },
      { arg: "i", describe: "interval to try in second", default: 2 },
    ],
  })
  .perform(async (argv) => {
    // [ $? -eq 0 ] && echo "$cmd command was successful" || echo "$cmd failed"
    await u
      .promiseTryTimes(
        () => {
          let result = cmd(argv.c, false, true, true);
          if (result.status > 0) {
            console.log("retry ...", argv.c);
            console.log(result.stderr.toString().trim());
            return Promise.reject();
          } else {
            return console.log(u.stringReplace(result.stdout.toString().trim()));
          }
        },
        argv.t,
        argv.i
      )
      .catch(() => cmd("exit 1"));
  });

new ucmd("docker")
  .describer({
    main: "docker additional command",
    options: [
      { arg: "c", describe: "clean <none> images", boolean: true },
      { arg: "i", describe: "images display", boolean: true },
      { arg: "p", describe: "process list AKA containter", boolean: true },
      { arg: "a", describe: "all display", boolean: true },
      { arg: "b", describe: "build dockerfile with result name, as $targetName:version,$sourcefile" },
      { arg: "o", describe: "docker find port" },
      { arg: "s", describe: "stop the container" },
      { arg: "S", describe: "start the container" },
      { arg: "l", describe: "logs path of container" },
      { arg: "L", describe: "live log" },
      { arg: "v", describe: "volume listing" },
      { arg: "n", describe: "network status" },
      { arg: "r", describe: "remove container" },
      { arg: "R", describe: "remove container and its volume" },
      { arg: "e", describe: "execute or run with bash" },
      { arg: "E", describe: "execute directly with bash" },
      { arg: "T", describe: "transfer file with save or load, can be $i:ver or i_ver.tar, better define ver" },
    ],
  })
  .perform(async (argv) => {
    if (argv.c) cmd("sudo docker system prune --volumes");
    if (argv.i) cmd("sudo docker images" + (argv.a ? " -a" : ""));
    if (argv.p) cmd("sudo docker ps" + (argv.a ? " -a" : ""));
    if (argv.p) cmd("sudo docker ps | grep " + argv.p);
    if (argv.r) cmd(`sudo docker container stop ${argv.r} && sudo docker container rm ${argv.r}`);
    if (argv.s) cmd(`sudo docker container stop ${argv.s}`);
    if (argv.S) cmd(`sudo docker container start ${argv.S}`);
    if (argv.l) cmd(`sudo docker inspect --format={{.LogPath}} ${argv.l}`);
    if (argv.L) cmd(`sudo docker logs -f ${argv.L}`);
    if (argv.v) cmd(`sudo docker volume ls`);
    if (argv.e)
      cmd(`sudo docker $(sudo docker ps | grep -q ${argv.e} && echo "exec" || echo "run") -it ${argv.e} /bin/bash`);
    if (argv.E) cmd(`sudo docker exec -it ${argv.E} /bin/bash`);
    if (argv.b) {
      argv.b = u.stringToArray(argv.b, ",");
      let sentence = "sudo docker image build ";
      if (u.contains(argv.b[0], ":"))
        sentence += `-t ${argv.b[0]} -t ${u.stringReplace(argv.b[0], { ":.+": "" })}:latest `;
      if (argv.b[1]) sentence += "-f " + argv.b[1];
      cmd(sentence);
    }
    if (argv.R) {
      let target = JSON.parse(cmd(`sudo docker inspect ${argv.R}`, false, true));
      cmd(`sudo docker container stop ${argv.R} && sudo docker container rm ${argv.R}`);
      let mounts = target[0]["Mounts"];
      let qs = (volume) =>
        cmdq({ ["remove volume" + volume + " (N)"]: false }).then((result) => {
          if (result && result.toLowerCase() == "y") cmd(`sudo rm -rf ${volume}`);
        });
      if (mounts != undefined) for (let i of mounts) await qs(i["Source"]);
    }
    if (argv.n) argv.n === true ? cmd("sudo docker network ls") : cmd("sudo docker network inspect " + argv.n);
    if (argv.T) {
      if (u.contains(argv.T, ".tar")) {
        cmd(`sudo docker load < ${argv.T}`);
      } else {
        if (u.contains(argv.T, ":")) {
          let ver = u.refind(argv.T, u.regexBetweenOut(":", "$"));
          let rname = u.refind(argv.T, u.regexBetweenOut("^", ":"));
          cmd(`sudo docker save -o ${rname}_ver_${ver}.tar ${argv.T}`);
        } else {
          cmd(`sudo docker save -o ${argv.T}.tar ${argv.T}`);
        }
      }
    }
  });

new ucmd("dc")
  .describer({
    main: "docker-compose command",
    options: [
      { arg: "u", describe: "up, detached mode", boolean: true },
      { arg: "d", describe: "down, and remove orphan", boolean: true },
      { arg: "i", describe: "images display", boolean: true },
      { arg: "p", describe: "process list AKA containter", boolean: true },
      { arg: "r", describe: "stop container and remove corresponding volume", boolean: true },
      { arg: "e", describe: "execute bash command" },
      { arg: "L", describe: "live log" },
      { arg: "l", describe: "logs service" },
    ],
  })
  .perform(async (argv) => {
    if (argv.u) return cmd("sudo docker-compose up -d");
    if (argv.d) return cmd("sudo docker-compose down --remove-orphans");
    if (argv.i) return cmd("sudo docker-compose images");
    if (argv.p) return cmd("sudo docker-compose ps" + (argv.a ? " -a" : ""));
    if (argv.r) return cmd("sudo docker-compose rm -s");
    let loadKeys = () => {
      let yobj = yamlParser.load("docker-compose.yml");
      return multiSelect(u.mapKeys(yobj.services));
    };
    if (argv.e) {
      if (argv.e === true) argv.e = await loadKeys();
      return cmd(`sudo docker-compose exec --privileged ${argv.e} /bin/bash`);
    }
    if (argv.l) {
      if (argv.l === true) argv.l = await loadKeys();
      return cmd("sudo docker-compose logs " + argv.l);
    }
    if (argv.L) {
      if (argv.L === true) argv.L = await loadKeys();
      return cmd(`sudo docker-compose logs -f ${argv.L}`);
    }
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
      { arg: "h", describe: "if the file contains this string" },
      { arg: "r", describe: "regex test the file" },
      { arg: "g", describe: "global /g", boolean: true },
      { arg: "t", describe: "test the result", boolean: true },
    ],
  })
  .perform((argv) => {
    let path = fileExistProcess(argv.f);
    let content = fs.readFileSync(path).toString();

    if (argv.h) return console.log(u.contains(content, argv.h));
    if (argv.r) return console.log(new RegExp(argv.r).test(content));

    let processed = u.stringReplace(content, { [argv.o]: argv.n }, true, argv.t);

    if (argv.t) return console.log(processed);
    return fs.writeFileSync(path, processed);
  });

new ucmd("pkgjson", "name", "script")
  .describer({
    main: "node package.json modifier",
    options: [
      { arg: "n", describe: "name of the script" },
      { arg: "s", describe: "script to add or replace" },
      { arg: "h", describe: "has this script ?" },
      { arg: "l", describe: "list all the commands", boolean: true },
    ],
  })
  .perform((argv) => {
    let path = "package.json";
    if (!fs.existsSync(path)) path = "../package.json";
    if (!fs.existsSync(path)) return console.error("Error: package.json file does not exist");
    let data = JSON.parse(fs.readFileSync(path).toString());
    if (argv.h) return console.log(data["scripts"][argv.h] != undefined);
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
      { arg: "p", describe: "parse file, as a location" },
      { arg: "s", describe: "separator of the result", default: " " },
      { arg: "l", describe: "line to skip", default: 0 },
      { arg: "k", describe: "key path to get from json, e.g: a,b,c" },
      { arg: "K", describe: "keys of map get exist" },
      { arg: "j", describe: "Json stringify the result", boolean: true },
    ],
  })
  .perform((argv) => {
    if (argv.p) argv.c = `cat ${argv.p}`;
    let result =
      u._parseJsonCheck(cmd(argv.c, false, true)) == null
        ? shellParser(cmd(argv.c, false, true), { separator: argv.s, skipLines: argv.l })
        : u.stringToJson(cmd(argv.c, false, true));

    if (argv.k) {
      let copy = u.deepCopy(result);
      u.stringToArray(argv.k, ",").map((k) => {
        copy = copy[k];
      });
      return console.log(copy);
    }
    if (argv.K) {
      let copy = u.deepCopy(result);
      let keys = u.stringToArray(argv.K, ",");
      if (Array.isArray(copy)) return console.log(copy.map((i) => u.mapGetExist(i, ...keys)));
      return console.log(u.mapGetExist(copy, keys));
    }

    if (argv.j) console.log(JSON.stringify(result));
    else console.log(result);
  });

new ucmd("filter", "cmd", "columns")
  .describer({
    main: "filter columns of cmd",
    options: [
      { arg: "m", describe: "cmds" },
      { arg: "c", describe: `columns to select, like '$1,"|",$2'` },
      { arg: "j", describe: "json parse the result", boolean: true },
      { arg: "J", describe: "json stringify", boolean: true },
    ],
  })
  .perform((argv) => {
    let result = cmd(`${argv.m} | awk '{print${argv.c}}'`, false, true);
    if (argv.j) return console.log(shellParser(result));
    if (argv.J) return console.log(JSON.stringify(shellParser(result), undefined, ""));
    return console.log(result);
  });

new ucmd("backup", "file")
  .describer({
    main: "backup a file to normal backup folder",
    options: [
      { arg: "f", describe: "file location" },
      { arg: "l", describe: "list current backed up file", boolean: true },
      { arg: "r", describe: "remove backed up file" },
    ],
  })
  .perform(async (argv) => {
    let basePath = process.env.HOME + "/.application/backup/";
    let recordsPath = basePath + ".readme.json";
    if (!fs.existsSync(recordsPath)) fs.writeFileSync(recordsPath, "{}");
    let backupJson = JSON.parse(fs.readFileSync(recordsPath).toString());
    if (argv.l) return console.log(backupJson);

    if (argv.r) {
      let target = u.mapKeys(backupJson).filter((i) => u.contains(i, argv.r));
      return multiSelect(target).then((data) => {
        fs.unlinkSync(basePath + data);
        delete backupJson[data];
        return fs.writeFileSync(recordsPath, u.jsonToString(backupJson));
      });
    }

    argv.f = fileExistProcess(argv.f);
    let time = getTime();
    let filename = paths.basename(argv.f) + [time.year, time.month, time.day, time.hour, time.minute].join("-");

    backupJson[filename] = argv.f;
    cmd(`cp ${argv.f} ${process.env.HOME}/.application/backup/${filename}`);
    fs.writeFileSync(recordsPath, u.jsonToString(backupJson));
  });

new ucmd("regex", "string", "regexp")
  .describer({
    main: 'js regular expression, better use " to wrap around string',
    options: [
      { arg: "l", describe: 'line of string, better use "$(cmd)"' },
      { arg: "r", describe: "regex" },
      { arg: "c", describe: "command to execute and get result as string to grep" },
      { arg: "s", describe: "substitute" },
      { arg: "b", describe: "between in ITEM1,ITEM2 non-greedy" },
      { arg: "B", describe: "between out ITEM1,ITEM2 non-greedy" },
      { arg: "g", describe: "global flag", boolean: true },
    ],
  })
  .perform((argv) => {
    let re = argv.r;
    if (argv.c) argv.l = cmd(argv.c + " 2>&1", false, true);
    if (argv.s) return console.log(u.reSub(argv.l, re, argv.s));
    if (argv.b) {
      let items = u.stringToArray(argv.b, ",");
      return console.log(u.refind(argv.l, u.regexBetweenInNonGreedy(items[0], items[1])));
    }
    if (argv.B) {
      let items = u.stringToArray(argv.B, ",");
      return console.log(u.refind(argv.l, u.regexBetweenOutNonGreedy(items[0], items[1])));
    }
    return console.log(u.refind(argv.l, re));
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

new ucmd("link", "name")
  .describer({
    main:
      "link(ln) particular command to target user group, solve command not found issue, if command already exist, use $chmod",
    options: [
      { arg: "n", describe: "name of the command" },
      { arg: "u", describe: "user to use", default: "root" },
      { arg: "r", describe: "remove link" },
    ],
  })
  .perform((argv) => {
    let targetPathArr = u.stringToArray(cmd(`sudo -u ${argv.u} sh -c 'echo $PATH'`, false, true), ":");
    let properPath = targetPathArr.filter((i) => u.contains(i, "/bin"))[0];
    if (!properPath) properPath = targetPathArr[0];

    let cmdPath = cmd(`command -v ${argv.n}`, false, true).trim();
    if (argv.r) {
      cmdPath = cmd(`sudo -u ${argv.u} command -v ${argv.r}`, false, true).trim();
      return cmd(`sudo -u ${argv.u} unlink ${cmdPath}`, true);
    }

    return cmd(`sudo -u ${argv.u} ln -s ${cmdPath} ${properPath}/${argv.n}`, true);
  });

new ucmd("install", "name")
  .describer({
    main: "install command on different platform",
    options: [
      { arg: "n", describe: "name of the package" },
      { arg: "l", describe: "list installed package", boolean: true },
      { arg: "c", describe: "clean" },
    ],
  })
  .perform((argv) => {
    let platform = "";
    if (fs.existsSync("/etc/debian_version")) platform = "apt";
    if (fs.existsSync("/etc/redhat-release")) platform = "yum";
    if (os.platform() == "darwin") platform = "brew";
    if (os.platform() == "win32") platform = "choco";

    if (argv.n) {
      if (platform == "apt") return cmd(`sudo apt-get install -y ${argv.n}`);
      if (platform == "yum") return cmd(`sudo yum install -y ${argv.n}`);
      if (platform == "brew") return cmd(`sudo brew install -y ${argv.n}`);
      if (platform == "choco") return cmd(`choco install -y ${argv.n}`);
    }

    if (argv.l) {
      if (platform == "apt") return cmd(`sudo apt list --installed`);
      if (platform == "yum") return cmd(`sudo yum list installed`);
      if (platform == "brew") return cmd(`sudo brew list`);
      if (platform == "choco") return cmd(`choco list -li`);
    }

    if (argv.c) {
      if (platform == "apt") return cmd(`sudo apt-get clean`);
      if (platform == "yum") return cmd(`sudo yum clean all`);
      if (platform == "brew") return cmd(`sudo brew cleanup`);
    }
  });

new ucmd("eval", "line")
  .describer({
    main: "eval for nodejs",
    options: [{ arg: "l", describe: "line to eval" }],
  })
  .perform((argv) => {
    console.log(eval("(" + argv.l + ")"));
  });

new ucmd("result", "cmd")
  .describer({
    main: "parse command result into js object, as string | array | json",
    options: [
      { arg: "C", describe: "command to run" },
      { arg: "c", describe: "columns NO. to be selected from, like 1,4,5" },
      { arg: "f", describe: "full output as 2>&1", boolean: true },
      { arg: "h", describe: "head to skip by number of lines" },
      { arg: "t", describe: "tail to skip by number of lines" },
    ],
  })
  .perform((argv) => {
    let command = argv.C;
    if (argv.f) command += " 2>&1";
    if (argv.h) command += ` | head -n ${argv.h}`;
    if (argv.t) command += ` | tail -n ${argv.t}`;
    if (argv.c) command += ` | awk '{print $${u.stringReplace(argv.c, { ",": ',"||",$' }, false)}}'`;
    let result = cmd(command, false, true);
    if (u.contains(result, "||")) result = shellParser(result, { separator: "||" });
    else result = shellParser(result);
    console.log(result);
  });

new ucmd("exist", "path")
  .describer({
    main: "check if file or direcoty exist",
    options: [
      { arg: "p", describe: "path to check" },
      { arg: "f", describe: "files only", boolean: true },
      { arg: "d", describe: "directory only", boolean: true },
    ],
  })
  .perform((argv) => {
    let exist = fs.existsSync(argv.p);
    if (!exist) return console.log(false);
    if (argv.f) return console.log(!fs.lstatSync(argv.p).isDirectory());
    if (argv.d) return console.log(fs.lstatSync(argv.p).isDirectory());
    return console.log(true);
  });

new ucmd("dep")
  .describer({
    main: "dependency repo modify",
    options: [
      { arg: "l", describe: "list dependencies", boolean: true },
      { arg: "r", describe: "remove target depencies" },
    ],
  })
  .perform((argv) => {
    let pkgPath = "";
    if (fs.existsSync("/etc/debian_version")) pkgPath = "/etc/apt/sources.list.d";
    if (fs.existsSync("/etc/redhat-release")) pkgPath = "/etc/yum.repos.d";
    if (pkgPath == "") return console.log("platform not supported");
    let full = () => read.promise(pkgPath).then((d) => d.map((i) => i.fullPath));
    if (argv.l) return full().then(console.log);
    if (argv.r) {
      return full().then(async (d) => {
        let processed = d.filter((i) => u.contains(i, argv.r));
        let target = await multiSelect(processed);
        cmd(`u backup ${target}`);
        cmd(`sudo rm -rf ${target}`);
      });
    }
  });

new ucmd("os", "is")
  .describer({
    main: "find your os name",
    options: [
      { arg: "i", describe: "is it ... ? can be win | linux | mac | centos ..." },
      { arg: "v", describe: "find versions", boolean: true },
    ],
  })
  .perform((argv) => {
    if (argv.i) {
      if (argv.i == "win") return console.log(os.platform() == "win32");
      if (argv.i == "linux") return console.log(os.platform() == "linux");
      if (argv.i == "mac") return console.log(os.platform() == "darwin");
      if (u.contains(["apt", "rpm", "deb", "yum", "dnf"], argv.i))
        return console.log(cmd(`command -v ${argv.i}`, 0, 1, 1).status == 0);
      if (os.platform() != "linux") throw "system is not linux based";

      let content = fs.readFileSync("/etc/os-release").toString().toLowerCase();
      return console.log(u.contains(content, argv.i));
    }
    if (argv.v) {
      if (checkOS("linux")) return cmd("uname -r");
      if (checkOS("win")) return console.log(os.version());
      if (checkOS("mac")) return cmd("sw_vers -productVersion");
    }
    console.log({
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      username: os.userInfo().username,
    });
  });

new ucmd("helper")
  .describer({
    main: "helper for other commands",
    options: [
      { arg: "n", describe: "name" },
      { arg: "e", describe: "edit with code", boolean: true },
      { arg: "s", describe: "software needs to be preinstalled" },
      { arg: "u", describe: "update package", boolean: true },
    ],
  })
  .perform((argv) => {
    let projectPath = __dirname + "/../";
    if (argv.e) return cmd("code " + projectPath);
    if (argv.s)
      return console.log({
        prescript: `wget -O - https://truth1984.github.io/testSites/s/prescript.sh | bash`,
        tools: `wget -O - https://truth1984.github.io/testSites/s/tools.sh | bash`,
        desktop: `wget -O - https://truth1984.github.io/testSites/s/desktop.sh | bash`,
      });
    if (argv.u) return cmd(`cd ${projectPath} && rm package-lock.json && git pull && npm i`);
    let list = {
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
        web: "https://crontab.guru/",
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
        shEcho: "sh -c 'echo 0'",
        mkdir: "mkdir -p",
        currentFolder: '"${PWD##*/}"',
        fullOutput: "2>&1",
        killProcessAfter: "timeout $xSec $cmd",
      },
      ssh: {
        config: "nano /etc/ssh/sshd_config",
        restart: "u service -r=ssh",
      },

      backup: {
        script:
          'sudo rsync -aAXv / --exclude={"/dev/*","/proc/*","/sys/*","/tmp/*","/run/*","/mnt/*","/media/*","/lost+found","/dest"} /dest',
        transfer: "rsync --progress -avuzh user@host:/source/path/copyfrom user@host:/destination/path/dumpto",
      },
      hostname: {
        view: "hostnamectl",
        edit: "hostnamectl set-hostname ",
      },
      pw: {
        change: "sudo passwd",
        changeUser: "sudo passwd $user",
        changeGroup: "sudo passwd -g $group",
        expire: "sudo passwd -e $user",
      },
    };
    if (argv.n) console.log(list[argv.n]);
    else console.log(list);
  });

new ucmd().run();
