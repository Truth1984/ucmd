#!/usr/bin/env node

var ucmd = require("../helper/_helper");
var cmd = require("../helper/_cmd");
var download = require("../helper/downloader");
var recorder = require("../helper/quickRecord");
var os = require("os");
var osu = require("os-utils");
var fs = require("fs");
var readdirp = require("readdirp");
var paths = require("path");
var u = require("awadau");
const cu = require("cmdline-util");
require("./test");

const util = require("../helper/util");

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

new ucmd("port", "portnum")
  .describer({
    main: "scan for a specific port",
    options: [
      { arg: "p", describe: "port number or process name" },
      { arg: "d", describe: "docker container port" },
      { arg: "c", describe: "connection details" },
    ],
  })
  .perform((argv) => {
    if (os.platform() == "win32") {
      if (!argv.p) return cmd("netstat -bn");
      return cmd("netstat -bn | grep " + argv.p);
    }
    if (argv.d) {
      if (argv.d == true) return cmd(`sudo docker ps --format "{{.Ports}}\t:\t{{.Image}}"`);
      else return cmd(`sudo docker ps | grep  ${argv.d}`);
    }
    if (argv.c) return cmd(`sudo lsof -i :${argv.c}`);

    if (!argv.p) return cmd("sudo netstat -plntu");
    return cmd("sudo netstat -lntup | grep " + argv.p);
  });

new ucmd("ip")
  .describer({
    main: "find local ip adress",
    options: [{ arg: "p", describe: "public ip address find", boolean: true }],
  })
  .perform((argv) => {
    if (argv.p) return cmd(`curl ident.me`);
    cmd("ifconfig | grep inet", true);
  });

new ucmd("scan", "ip", "port")
  .describer({
    main: "probe target machine",
    options: [
      { arg: "i", describe: "ip to probe" },
      { arg: "A", describe: "all ports", boolean: true },
    ],
  })
  .perform((argv) => {
    let ip = argv.i;
    if (argv.A) return cmd(`nmap -Pn- ${ip}`);
    cmd(`nmap -p- ${ip}`);
  });

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
    if (argv.t) return cmd(`sudo tcpdump ${argv.t ? "-i" + argv.t : ""}`);
    if (argv.d) return cmd("sudo nethogs " + argv.d);
    return cmd("sudo nethogs -s");
  });

new ucmd("pid", "id")
  .describer({
    main: "find system information about the target id",
    options: [
      { arg: "p", describe: "pid" },
      { arg: "s", describe: "systemctl status about target", boolean: true },
      { arg: "d", describe: "directory of running process", boolean: true },
      { arg: "P", describe: "process information", boolean: true },
      { arg: "D", describe: "detailed directory or file system of target process", boolean: true },
      { arg: "n", describe: "network connection of target pid", boolean: true },
      { arg: "N", describe: "network port", boolean: true },
      { arg: "R", describe: "relationship finder", boolean: true },
      { arg: "A", describe: "all display", boolean: true },
      { arg: "l", describe: "log the pid details, type: read,write,open,close,%file,%process,%net,%network" },
    ],
  })
  .perform((argv) => {
    let pid = argv.p;
    let dlog = (describe, line) => {
      console.log("-----", describe, "-----");
      return cmd(line);
    };
    if (argv.s || argv.A) dlog("systemctl", `sudo systemctl status ${pid}`);
    if (argv.d || argv.A) dlog("starting directory", `sudo pwdx ${pid}`);
    if (argv.P || argv.A) dlog("process info (grep)", `sudo ps -auxwwf | grep ${pid}`);
    if (argv.D || argv.A) dlog("detailed info", `sudo lsof -p ${pid}`);
    if (argv.N || argv.A) dlog("network port (grep)", `sudo netstat -plntu | grep ${pid}/`);
    if (argv.R || argv.A) dlog("process relationship", `sudo pstree -laps ${pid}`);
    if (argv.n || argv.A) dlog("established network connection (grep)", `sudo lsof -i | grep ${pid}`);

    if (argv.l) return cmd(`sudo strace -p${pid} -f -t -e ${argv.l == true ? "all" : argv.l}`);
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
      let cmdline = argv.a
        ? result.indexOf("...") > -1
          ? result.replace("...", argv.a)
          : result + " " + argv.a
        : result;
      return result ? cmd(cmdline, true) : "";
    }
    if (argv.r) return recorder.remove(argv.r);
  });

new ucmd("sf", "content", "basedir")
  .describer({
    main: "find the file in location, basedir default to current location",
    options: [
      { arg: "c", describe: "content inside a file" },
      { arg: "b", describe: "base directory of the file", default: "." },
      { arg: "i", describe: "Ignore file pattern", default: "/mnt,package-lock*,node_module,yarn.lock" },
      { arg: "D", describe: "subdirectory Depth", default: 10 },
      { arg: "s", describe: "Show matched Content", boolean: true },
      { arg: "A", describe: "all the file to be searched", boolean: true },
    ],
  })
  .perform((argv) => {
    let line = `sudo ag --follow --column --noheading --depth ${argv.D} `;
    if (!argv.s) line += "--files-with-matches ";
    if (!argv.A && argv.i) line += `--ignore={${argv.i}} `;
    if (argv.A) line += "--unrestricted ";

    line += `'${argv.c}' ${argv.b}`;
    return cmd(line);
  });

new ucmd("search", "target", "basedir")
  .describer({
    main: "find the file in location, basedir default to current location",
    options: [
      { arg: "t", describe: "target filename" },
      { arg: "b", describe: "base directory of the file", default: "." },
      {
        arg: "i",
        describe: "Ignore directory like ['!log'], Include like ['*_log']",
        default: ["!.git", "!*modules", "!mnt"],
      },
      { arg: "I", describe: "Ignore files like ['!.git'], Include like ['*.js']" },
      { arg: "a", describe: "output result as an array", boolean: true },
      { arg: "d", describe: "directory only", boolean: true },
      { arg: "f", describe: "file only", boolean: true },
      { arg: "D", describe: "subdirectory Depth", default: 10 },
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
    let nameArr = await readdirp.promise(basedir, options);

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

new ucmd("sys", "target")
  .describer({
    main: "display system information",
    options: [
      { arg: "t", describe: "target", default: "." },
      { arg: "s", describe: "size of file" },
      { arg: "h", describe: "hardware information", boolean: true },
      { arg: "b", describe: "basic info", boolean: true },
      { arg: "B", describe: "basic info with details", boolean: true },
      { arg: "l", describe: "large file on this directory" },
      { arg: "L", describe: "large file on this directory, but add grep support" },
      { arg: "C", describe: "crontab inspect for each user", boolean: true },
    ],
  })
  .perform(async (argv) => {
    if (argv.s) return cmd(`du -sh ${argv.s}`);
    if (argv.h) return cmd("df -Th");
    if (argv.l)
      return cmd("sudo du -ahx . | sort -rh | head -n " + (Number.isNaN(Number.parseInt(argv.l)) ? 20 : argv.l));
    if (argv.L) return cmd(`sudo du -ahx . | sort -rh | grep ${argv.L} | head -n 30`);
    if (argv.B) return cmd(`cat /proc/cpuinfo && cat /proc/meminfo`);
    if (argv.b) {
      const cpup = new Promise((r) => osu.cpuUsage((p) => r(p)));
      let basic = {
        freeMem: os.freemem() / 1024 / 1024 + "MB",
        totalMem: os.totalmem() / 1024 / 1024 + "MB",
        "freeMem%": osu.freememPercentage() * 100,
        totalCpu: os.cpus().length,
        "cpu%": (await cpup) * 100,
      };
      if (util.checkOS("linux")) {
        let df = u.stringToJson(cmd(`u result -j "df -m"`, false, true));
        let dfResult = df.filter(
          (item) =>
            item.Filesystem != "overlay" && !u.contains(item.Filesystem, "tmp") && u.int(item["1M-blocks"]) > 10000
        );
        basic["fs"] = dfResult;
      }

      return console.log(basic);
    }

    if (argv.C)
      return cmd("for user in $(cut -f1 -d: /etc/passwd); do echo ---$user--- ; sudo crontab -u $user -l ; done");
    if (fs.lstatSync(argv.t).isDirectory()) return cmd(`cd ${argv.t} && ls -alFh`);
    else return cmd(`stat ${argv.t}`);
  });

new ucmd("mount", "target")
  .describer({
    main: "mount or unmount a device, use `mkfs.ext4 /dev/target` to change type",
    options: [
      { arg: "m", describe: "mount target, may change name to /dev/$name" },
      { arg: "M", describe: "mount directly to target directory, require $device,$directory" },
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
    if (argv.M) {
      let mountArr = u.stringToArray(argv.M, ",");
      let device = mountArr[0];
      let directory = mountArr[1];

      if (!fs.existsSync(directory)) fs.mkdirSync(directory);
      return cmd(`sudo mount ${device} ${directory}`);
    }

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

new ucmd("ssh", "address", "name", "description")
  .describer({
    main: "use keygen to generate key pairs",
    options: [
      { arg: "a", describe: "address, like root@localhost:22, auto add to ansible lists" },
      { arg: "n", describe: "name of alias, should be sshIP" },
      { arg: "A", describe: "description of alias" },
      { arg: "l", describe: "list grouped address for ansible use" },
      { arg: "L", describe: "list parsed and separated by ," },
      { arg: "c", describe: "connect to the target host by pattern" },
      { arg: "p", describe: "proxy socks5 to $host,$localport=15542" },
      { arg: "D", describe: "describe each ip in details with ansible", boolean: true },
      { arg: "E", describe: "edit ansible list", boolean: true },
      { arg: "r", describe: "refresh keygen token", boolean: true },
    ],
  })
  .perform(async (argv) => {
    if (argv.l) return util.ansibleGetUserRawEcho(argv.l);
    if (argv.E) return cmd(`u ansible -E`);
    if (argv.D) {
      let result = {};
      let users = util.ansibleGetUserList(argv.D);
      for (let i of users) result[i] = util.ansibleInventoryData(i);
      return console.log(result);
    }

    if (argv.c) {
      let users = util.ansibleGetUserList(argv.c);
      let target = u.len(users) > 1 ? await util.multiSelect(users) : users[0];
      let invdata = util.ansibleInventoryData(target);
      console.log(`connecting to <${target}>, as <${invdata.u_describe}>`);
      return cmd(`ssh -p ${invdata.ansible_port} ${invdata.ansible_user}@${invdata.addr ? invdata.addr : target}`);
    }

    if (argv.p) {
      let infoArr = u.stringToArray(argv.p, ",");
      let localPort = infoArr[1] ? infoArr[1] : 15542;
      let users = util.ansibleGetUserList(infoArr[0]);
      let target = u.len(users) > 1 ? await util.multiSelect(users) : users[0];
      let invdata = util.ansibleInventoryData(target);
      console.log("use screen to persist connection on port", localPort);
      return cmd(
        `ssh -4 -p ${invdata.ansible_port} -D ${localPort} -N ${invdata.ansible_user}@${
          invdata.addr ? invdata.addr : target
        }`
      );
    }

    if (argv.L) return console.log(util.ansibleGetUserList(argv.L));

    if (!argv.n) return cu.cmderr("ansible unique name not specified", "ansible");
    let { user, addr, port } = cu.sshGrep(argv.a);
    let description = argv.A ? `-A=${argv.A} ` : "";
    cmd(`u ansible ${argv.n} -a=${argv.a} ${description}`);

    let keygen = "ssh-keygen -t rsa -b 4096";
    if (argv.r) cmd(keygen);
    cmd(`if ! [ -f $HOME/.ssh/id_rsa ]; then ${keygen}; fi;`);

    cmd(`ssh-copy-id -i ~/.ssh/id_rsa.pub -p ${port} ${user}@${addr}`);
    cmd(`u quick ${argv.n} "ssh -p ${port} ${user}@${addr}"`);
  });

new ucmd("process", "name")
  .describer({
    main: "show list of current process",
    options: [
      { arg: "n", describe: "name to grep" },
      { arg: "f", describe: "full command display", boolean: true },
      { arg: "s", describe: "sorted ps command by cpu first, get first 10" },
      { arg: "S", describe: "sorted ps command by memory first, get first 10" },
      { arg: "l", describe: "Log output with strace, using PID" },
      { arg: "K", describe: "kill relevant process" },
      { arg: "d", describe: "directory of running process, require pid" },
      { arg: "D", describe: "detailed directory or file system of target process, require pid" },
    ],
  })
  .perform((argv) => {
    let base = "ps -aux";
    if (argv.f) base += "wwf";
    if (argv.n) return cmd(base + " | grep " + argv.n);
    if (argv.s) return cmd(`ps auxk -%cpu,%mem | head -n${u.int(argv.s) ? u.int(argv.s) : 10}`);
    if (argv.S) return cmd(`ps auxk -%mem,%cpu | head -n${u.int(argv.S) ? u.int(argv.S) : 10}`);
    if (argv.l) return cmd(`sudo strace -p${argv.l} -s9999 -e write`);
    if (argv.K) {
      let result = cmd(`ps -ae | { head -1; grep ${argv.K}; }`, false, true);
      return cu.shellParser(result).map((item) => cmd(`kill ${item.PID}`));
    }
    if (argv.d) return cmd(`sudo pwdx ${argv.d}`);
    if (argv.D) return cmd(`sudo lsof -p ${argv.D}`);
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
      if (!fs.existsSync(".git")) return util.cmderr("git folder not found", "gitclone");
      return cmd(`cp -a $DIR/gitfile/. ./`);
    }

    if (argv.D) {
      if (!fs.existsSync("package.json")) return util.cmderr("package.json not found", "gitclone");
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
    if (!argv.l) return util.cmderr("location not specified", "gitwatch");
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

    if (content.indexOf(screenName) > -1)
      return cu.cmderr(screenName + " already exist, modify by using crontab -e", "gitwatch");

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
    if (!argv.d && !argv.n) return cu.cmderr("name of the path undefined", "addPath");
    if ((argv.a || argv.e) && !argv.v) return cu.cmderr("value of the path undefined", "addPath");
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
      { arg: "a", describe: "attribute inspect" },
    ],
  })
  .perform((argv) => {
    if (argv.f) return cmd("sudo chattr +i " + argv.f);
    if (argv.u) return cmd("sudo chattr -iau" + argv.u);
    if (argv.a) {
      console.log(
        '{"a":"append only","A":"no atime updates","c":"compressed","C":"no copy on write","d":"no dump","D":"synchronous directory updates","e":"block extents","i":"immutable","j":"data journalling","P":"project hierarchy","s":"secure deletion","S":"synchronous updates","t":"no tail merging","T":"top of directory hierarchy","u":"undeletable","E":"compression error","h":"huge file","I":"indexed directory","N":"inline data","X":"compression raw access","Z":"compressed dirty file"}'
      );
      return cmd(`lsattr ${argv.a}`);
    }
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
      { arg: "l", describe: "log service journal since boot" },
      { arg: "L", describe: "log service journal full" },
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
        .map((i) => u.stringReplace(i, { ".service$": "" }))
        .sort((a, b) => a.length - b.length);
      return cu.multiSelect(target, undefined, undefined, quitOnUdf);
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
      return cu.cmdsq("disable service: " + target + "(y/N)").then((ans) => {
        if (ans[0] === "y") cmd(`sudo systemctl disable ${target} && sudo systemctl stop ${target}`, true);
        if (argv.A) return;
        cmd(`sudo service ${target} status`);
      });
    }

    if (argv.r) return cmd(`sudo systemctl restart ${await fuzzy(argv.r)}`);
    if (argv.l) return cmd(`sudo journalctl -u ${await fuzzy(argv.l)}.service -b `);
    if (argv.L) return cmd(`sudo journalctl -u ${await fuzzy(argv.l)}.service`);
    cmd(`sudo systemctl list-units --type service --all`);
  });

new ucmd("encode", "line")
  .describer({
    main: "use different methods on string",
    options: [
      { arg: "l", describe: "line to manipulate" },
      { arg: "p", describe: "password generation, define length" },
      { arg: "P", describe: "password generation with auto base64 encode, define length" },
      { arg: "m", describe: "md5 sum calculate", boolean: true },
      { arg: "b", describe: "base64 encode", boolean: true },
      { arg: "B", describe: "base64 decode", boolean: true },
    ],
  })
  .perform((argv) => {
    let string = argv.l;
    if (argv.p) return console.log(u.randomPassword(argv.p == true ? 8 : argv.p, 1, 1));
    if (argv.P) return console.log(Buffer.from(u.randomPassword(argv.P == true ? 8 : argv.P, 1, 1)).toString("base64"));
    if (argv.m) return cmd(`echo -n ${string} | md5sum`);
    if (argv.b) console.log(Buffer.from(string).toString("base64"));
    if (argv.B) return console.log(Buffer.from(string, "base64").toString());
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
      .promiseTryTimesInfo(
        (err, remain) => {
          if (err) console.log("retrying ...", u.dateFormat("plain"), remain + " times remain", argv.c, "\n" + err);
          let result = cmd(argv.c, false, true, true);
          if (result.status > 0) return Promise.reject(result.stderr.toString().trim());
          else return console.log(result.stdout.toString().trim());
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
      { arg: "E", describe: "execute directly with bash,$or target" },
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
    if (argv.e) {
      let result = u.stringToArray(argv.e, ",");
      cmd(
        `sudo docker $(sudo docker ps | grep -q ${result[0]} && echo "exec" || echo "run") -it ${result[0]} ${
          result[1] ? result[1] : "/bin/bash"
        }`
      );
    }

    if (argv.E) {
      let result = u.stringToArray(argv.E, ",");
      cmd(`sudo docker exec -it ${result[0]} ${result[1] ? result[1] : "/bin/bash"}`);
    }
    if (argv.b) {
      argv.b = u.stringToArray(argv.b, ",");
      let sentence = "sudo docker image build ";
      if (u.contains(argv.b[0], ":"))
        sentence += `-t ${argv.b[0]} -t ${u.stringReplace(argv.b[0], { ":.+": "" })}:latest `;
      else sentence += `-t ${argv.b[0]}:latest `;
      if (argv.b[1]) sentence += "-f " + argv.b[1] + " ";
      sentence += ". ";
      cmd(sentence);
    }
    if (argv.R) {
      let target = JSON.parse(cmd(`sudo docker inspect ${argv.R}`, false, true));
      cmd(`sudo docker container stop ${argv.R} && sudo docker container rm ${argv.R}`);
      let mounts = target[0]["Mounts"];
      let qs = (volume) =>
        cu.cmdsq("remove volume" + volume + " (N)").then((result) => {
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
          if (u.contains(rname, "/")) rname = u.refind(rname, u.regexBetweenOut("/", "$"));
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
      { arg: "u", describe: "up, detached mode, may specify path of .env file" },
      { arg: "d", describe: "down, and remove orphan", boolean: true },
      { arg: "i", describe: "images display", boolean: true },
      { arg: "b", describe: "build image", boolean: true },
      { arg: "p", describe: "process list AKA containter", boolean: true },
      { arg: "r", describe: "stop container and remove corresponding volume", boolean: true },
      { arg: "R", describe: "restart the container", boolean: true },
      { arg: "e", describe: "execute bash command" },
      { arg: "E", describe: "execute particular command" },
      { arg: "L", describe: "live log" },
      { arg: "l", describe: "logs service" },
    ],
  })
  .perform(async (argv) => {
    let loadKeys = () => cu.multiSelect(u.mapKeys(cu.yamlParser.load("docker-compose.yml").services));
    if (argv.e === true) argv.e = await loadKeys();
    if (argv.l === true) argv.l = await loadKeys();
    if (argv.L === true) argv.L = await loadKeys();

    if (argv.u) {
      if (fs.existsSync("docker-compose.yml") && !fs.existsSync(".env")) cmd(`touch .env`);
      return cmd(`sudo docker-compose --env-file ${u.typeCheck(argv.u, "str") ? argv.u : ".env"} up -d`);
    }
    if (argv.d) return cmd("sudo docker-compose down --remove-orphans");
    if (argv.i) return cmd("sudo docker-compose images");
    if (argv.b) return cmd("sudo docker-compose build --force-rm");
    if (argv.p) return cmd("sudo docker-compose ps" + (argv.a ? " -a" : ""));
    if (argv.r) return cmd("sudo docker-compose rm -s");
    if (argv.R) return cmd("sudo docker-compose restart");
    if (argv.e) return cmd(`sudo docker-compose exec --privileged ${argv.e} /bin/bash`);
    if (argv.E) return cmd(`sudo docker-compose exec --privileged ${await loadKeys()} ${argv.E}`);
    if (argv.l) return cmd("sudo docker-compose logs " + argv.l + " | tail -n500");
    if (argv.L) return cmd(`sudo docker-compose logs -f ${argv.L}`);
  });

new ucmd("post", "url", "data")
  .describer({
    main: "send post request",
    options: [
      { arg: "u", describe: "url" },
      { arg: "d", describe: "json data", default: "{}" },
      { arg: "g", describe: "get request", boolean: true },
    ],
  })
  .perform(async (argv) => {
    let target = argv.g ? u.promiseFetchGet : u.promiseFetchPost;
    await target(argv.u, cu.jsonParser(argv.d)).then(console.log);
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

    //sudo iptables-restore < /tmp/iptables_backup
    if (argv.s) return cmd(`sudo iptables-save > /tmp/iptables_backup_${u.dateFormat("plain")}`);

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
      if (argv.S == true) return cu.cmderr("internet interface not specified", "iptable");
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
    if (!fs.existsSync(path)) return cu.cmderr("package.json file does not exist", "pkgjson");
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
      { arg: "s", describe: "separator of the result", default: /\s+/ },
      { arg: "k", describe: "key path to get from json, e.g: a,b,c" },
      { arg: "K", describe: "keys of map get exist" },
      { arg: "j", describe: "Json stringify the result", boolean: true },
    ],
  })
  .perform((argv) => {
    if (argv.p) argv.c = `cat ${argv.p}`;
    let result =
      u._parseJsonCheck(cmd(argv.c, false, true)) == null
        ? cu.shellParser(cmd(argv.c, false, true), { separator: argv.s })
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
    if (argv.j) return console.log(cu.shellParser(result));
    if (argv.J) return console.log(JSON.stringify(cu.shellParser(result), undefined, ""));
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
      return cu.multiSelect(target).then((data) => {
        fs.unlinkSync(basePath + data);
        delete backupJson[data];
        return fs.writeFileSync(recordsPath, u.jsonToString(backupJson));
      });
    }

    argv.f = fileExistProcess(argv.f);
    let filename = paths.basename(argv.f) + u.dateFormat("plain");

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
    if (argv.p) console.log(cu.iniParser.parse(fs.readFileSync(argv.f).toString()));
    if (argv.b) cmd(`u backup ${argv.f}`);
    let objectify = () => cu.iniParser.parse(fs.readFileSync(argv.f).toString());
    let towrite = (content) => fs.writeFileSync(argv.f, cu.iniParser.encode(content), { flag: "w+" });
    if (argv.j) return towrite(Object.assign(objectify(), cu.jsonParser(argv.j, false)));
    if (argv.i) {
      let data = objectify();
      let input = cu.jsonParser(argv.i, false);
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

new ucmd("git")
  .describer({
    main: "git command integration",
    options: [
      { arg: "t", describe: "to which branch, move HEAD" },
      { arg: "b", describe: "initialize new branch, and jump to that branch" },
      { arg: "i", describe: "initialize proper branches, add test and dev", boolean: true },
      { arg: "S", describe: "sync from remote branch, option: master | test" },
      { arg: "m", describe: "move branch to target commit id, as $branchName,$id" },
      { arg: "M", describe: "move refs to target commit id, as $refName, $id" },
      { arg: "a", describe: "add changes as Rebase CURRENT -> HEAD as $newbranch -> $oldbranch, forcing" },
      { arg: "A", describe: "add changes as Rebase CURRENT -> HEAD as $newbranch -> $oldbranch " },
      { arg: "r", describe: "remove $branchName, locally" },
      { arg: "R", describe: "remove $branchName, locally and remotely" },
      { arg: "L", describe: "silence log", boolean: true },
    ],
  })
  .perform((argv) => {
    let adog = () => cmd("git log --all --decorate --oneline --graph");

    if (argv.t) cmd(`git checkout ${argv.t}`);
    if (argv.b) cmd(`git branch ${argv.b} && git checkout ${argv.b}`);
    if (argv.i) {
      cmd("git checkout -b test master && git checkout -b dev test");
      cmd("git checkout test && git push --set-upstream origin test");
      cmd("git checkout dev && git push --set-upstream origin dev");
    }
    if (argv.S) {
      if (argv.S == "master") cmd("git checkout master && git pull origin test");
      if (argv.S == "test") cmd("git checkout test && git pull origin dev");
    }
    if (argv.m) {
      let arr = u.stringToArray(argv.m, ",");
      if (!arr[1]) return cu.cmderr("move $branchName,$id not defined", "git");
      cmd(`git checkout ${arr[0]} && git reset --hard ${arr[1]}`);
    }
    if (argv.M) {
      let arr = u.stringToArray(argv.M, ",");
      if (!arr[1]) return cu.cmderr("move $refName,$id not defined", "git");
      cmd(`git push --force origin ${arr[1]}:refs/heads/${arr[0]}`);
    }
    if (argv.a) {
      let arr = u.stringToArray(argv.a, ",");
      if (!arr[1]) cmd(`git rebase -f ${arr[0]}`);
      else cmd(`git rebase -f ${arr[0]} ${arr[1]}`);
    }
    if (argv.A) {
      let arr = u.stringToArray(argv.A, ",");
      if (!arr[1]) cmd(`git rebase ${arr[0]}`);
      else cmd(`git rebase ${arr[0]} ${arr[1]}`);
    }
    if (argv.r) {
      console.log(`deleting local branch`, argv.r);
      cmd(`git branch -d ${argv.r}`);
    }
    if (argv.R) {
      console.log(`deleting local branch`, argv.R);
      cmd(`git branch -d ${argv.R}`);
      console.log(`deleting remote branch`, argv.R);
      cmd(`git push origin --delete ${argv.R}`);
    }

    if (!argv.L) return adog();
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
    if (!argv.g) return cu.cmderr("group undefined", "usermod");
    if (argv.i) return cmd(`sudo usermod -aG ${argv.g} ${argv.u}`, true);
    if (argv.r) return cmd(`sudo gpasswd -d ${argv.u} ${argv.g}`, true);
  });

new ucmd("link", "name")
  .describer({
    main:
      "link(ln) particular command to target user group, solve command not found issue, if command already exist, use $chmod",
    options: [
      { arg: "n", describe: "name of the command" },
      { arg: "o", describe: "original link trace" },
      { arg: "u", describe: "user to use", default: "root" },
      { arg: "r", describe: "remove link" },
    ],
  })
  .perform((argv) => {
    let targetPathArr = u.stringToArray(cmd(`sudo -u ${argv.u} sh -c 'echo $PATH'`, false, true), ":");
    let properPath = targetPathArr.filter((i) => u.contains(i, "/bin"))[0];
    if (!properPath) properPath = targetPathArr[0];

    let cmdPath = cmd(`command -v ${argv.n}`, false, true).trim();
    if (argv.o) return cmd(`sudo realpath ${argv.o}`);
    if (argv.r) {
      cmdPath = cmd(`sudo -u ${argv.u} command -v ${argv.r}`, false, true).trim();
      return cmd(`sudo -u ${argv.u} unlink ${cmdPath}`, true);
    }

    return cmd(`sudo -u ${argv.u} ln -s ${cmdPath} ${properPath}/${argv.n}`, true);
  });

// complete
new ucmd("install", "name")
  .describer({
    main: "install or upgrade command on different platform",
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

new ucmd("ansible", "name", "command")
  .describer({
    main: "ansible related command",
    options: [
      { arg: "n", describe: "name to put in the category or use", default: "localhost" },
      { arg: "c", describe: "command to run on target machine" },
      { arg: "s", describe: "script to run on the target machine" },
      { arg: "a", describe: "add host to hosts file" },
      { arg: "A", describe: "add description to hosts file " },
      { arg: "l", describe: "list hosts, can be pattern" },
      {
        arg: "p",
        describe: "proxy address, define $u_proxy in .bash_env http://user:pass@proxy:port, and fire up proxy server",
        boolean: true,
      },
      { arg: "D", describe: "debug mode", boolean: true },
      { arg: "C", describe: "cat the file", boolean: true },
      { arg: "E", describe: "edit the host file", boolean: true },
    ],
  })
  .perform(async (argv) => {
    let hostLoc = util.ansibleConf.inventory_location;
    if (!fs.existsSync(hostLoc)) {
      fs.mkdirSync(paths.dirname(hostLoc), { recursive: true });
      fs.writeFileSync(hostLoc, "");
    }
    let hostname = argv.n;
    let playbookdir = util.ansibleConf.playbookdir;
    let debugmode = argv.D ? "-vvv" : "";
    let preconfig =
      "DISPLAY_SKIPPED_HOSTS=false ANSIBLE_CALLBACK_WHITELIST=profile_tasks ANSIBLE_DEPRECATION_WARNINGS=False";
    let proxy = argv.p ? process.env.u_proxy : "''";
    if (argv.a) {
      let content = fs.readFileSync(hostLoc).toString();
      let { user, addr, port } = cu.sshGrep(argv.a);

      if (u.contains(content, addr)) return console.log(`ansible already has ${addr}`);
      let contentMap = cu.iniParser.parse(content);

      contentMap = u.mapMergeDeep(contentMap, { [hostname]: { [addr]: true } });

      let ipIdentify = u.reCommonFast().iplocal.test(addr) ? "local" : "remote";
      if (!contentMap[ipIdentify]) contentMap = u.mapMerge({ [ipIdentify]: {} }, contentMap);
      if (!u.contains(contentMap[ipIdentify], addr)) contentMap[ipIdentify][addr] = true;
      if (!u.contains(u.mapKeys(contentMap, hostname + ":vars")))
        contentMap[hostname + ":vars"] = {
          ansible_user: user,
          ansible_port: port,
          u_name: `${hostname}`,
          u_describe: argv.A ? argv.A : "",
        };

      let str = u.reSub(cu.iniParser.encode(contentMap), /(\d+.\d+.\d+.\d+)=true/, "$1");

      return fs.writeFileSync(hostLoc, str, { flag: "w+" });
    }

    if (argv.c) {
      argv.c = u.stringReplace(argv.c, { "\\$HOME": "~" });
      return cmd(
        `${preconfig} ansible-playbook ${debugmode} -i ${hostLoc} -e apb_host=${hostname} -e apb_http_proxy=${proxy} -e apb_runtype=shell -e "apb_shell='${argv.c}'" ${playbookdir}`,
        true
      );
    }

    if (argv.s) {
      return cmd(
        `${preconfig} ansible-playbook ${debugmode} -i ${hostLoc} -e apb_host=${hostname} -e apb_http_proxy=${proxy} -e apb_runtype=script -e apb_script='${paths.resolve(
          argv.s
        )}' ${playbookdir}`,
        true
      );
    }

    if (argv.l) return util.ansibleGetUserRawEcho(argv.l == true ? "all" : argv.l);
    if (argv.C) return cmd(`cat ${hostLoc}`);
    if (argv.E) return cmd(`nano ${hostLoc}`);
  });

//complete
new ucmd("eval", "line")
  .describer({ main: "eval for nodejs", options: [{ arg: "l", describe: "line to eval" }] })
  .perform((argv) => console.log(eval("(" + argv.l + ")")));

new ucmd("result", "cmd")
  .describer({
    main: "parse command result into js object, as string | array | json",
    options: [
      { arg: "C", describe: "command to run" },
      { arg: "c", describe: "columns NO. to be selected from, like 1,4,5" },
      { arg: "f", describe: "full output as 2>&1", boolean: true },
      { arg: "h", describe: "head to skip by number of lines" },
      { arg: "t", describe: "tail to skip by number of lines" },
      { arg: "j", describe: "json stringify result", boolean: true },
    ],
  })
  .perform((argv) => {
    let command = argv.C;
    if (argv.f) command += " 2>&1";
    if (argv.h) command += ` | tail -n +${argv.h}`;
    if (argv.t) command += ` | head -n +${argv.t}`;
    if (argv.c) command += ` | awk '{print $${u.stringReplace(argv.c, { ",": ',"||",$' }, false)}}'`;
    let result = cmd(command, false, true);
    if (u.contains(result, "||")) result = cu.shellParser(result, { separator: "||" });
    else result = cu.shellParser(result);
    if (argv.j) return console.log(u.jsonToString(result));
    else return console.log(result);
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

new ucmd("rpush", "to whom", "from file", "to file")
  .describer({
    main: "rsync push with ansible",
    options: [
      { arg: "w", describe: "to whom to push to" },
      { arg: "s", describe: "the path of source file" },
      { arg: "t", describe: "the path of target file" },
      {
        arg: "e",
        describe: "exclude file",
        default: '"/dev/*","/proc/*","/sys/*","/tmp/*","/run/*","/mnt/*","/media/*","/lost+found","/dest"',
      },
      { arg: "C", describe: "compression, -z option, might be slower", boolean: true },
    ],
  })
  .perform((argv) => {
    let source = argv.s;
    let target = argv.t;

    let users = util.ansibleGetUserList(argv.w);

    let opt = `--exclude={${argv.e}}`;
    let rArg = "-aAXvPh";
    if (argv.C) rArg += "z";

    for (let i of users) {
      let data = util.ansibleInventoryData(i);
      let port = data.ansible_port ? data.ansible_port : 22;
      let username = data.ansible_user ? data.ansible_user : "root";
      let addr = data.addr ? data.addr : i;

      cmd(`rsync ${rArg} -e 'ssh -p ${port}' ${opt} ${source} ${username + "@" + addr}:'${target}'`, true);
    }
  });

new ucmd("rpull", "from whom", "from file", "to file")
  .describer({
    main: "rsync pull with ansible",
    options: [
      { arg: "w", describe: "to whom to pull from" },
      { arg: "s", describe: "the path of source file" },
      { arg: "t", describe: "the path of target file" },
      {
        arg: "e",
        describe: "exclude file",
        default: '"/dev/*","/proc/*","/sys/*","/tmp/*","/run/*","/mnt/*","/media/*","/lost+found","/dest"',
      },
      { arg: "D", describe: "delete file after transfer", boolean: true },
      { arg: "C", describe: "compression, -z option, might be slower", boolean: true },
    ],
  })
  .perform((argv) => {
    let source = argv.s;
    let target = argv.t;

    let users = util.ansibleGetUserList(argv.w);

    let opt = `--exclude={${argv.e}} ${argv.D ? "--delete " : ""}`;

    for (let i of users) {
      let data = util.ansibleInventoryData(i);
      let port = data.ansible_port ? data.ansible_port : 22;
      let username = data.ansible_user ? data.ansible_user : "root";
      let addr = data.addr ? data.addr : i;

      let rArg = "-aAXvPh";
      if (argv.C) rArg += "z";

      let targetdir = paths.resolve(process.env.PWD, target, i);
      fs.mkdirSync(targetdir, { recursive: true });
      cmd(`rsync ${rArg} -e 'ssh -p ${port}' ${opt} ${username + "@" + addr}:'${source}' ${targetdir}`, true);
    }
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
    let pkgPath;
    if (fs.existsSync("/etc/debian_version")) pkgPath = "/etc/apt/sources.list.d";
    if (fs.existsSync("/etc/redhat-release")) pkgPath = "/etc/yum.repos.d";
    if (!pkgPath) return cu.cmderr("platform not supported on this os", "dep");
    let full = () => readdirp.promise(pkgPath).then((d) => d.map((i) => i.fullPath));
    if (argv.l) return full().then(console.log);
    if (argv.r)
      return full().then(async (d) => {
        let processed = d.filter((i) => u.contains(i, argv.r));
        let target = await cu.multiSelect(processed);
        cmd(`u backup ${target}`);
        cmd(`sudo rm -rf ${target}`);
      });
  });

new ucmd("os", "is")
  .describer({
    main: "find your os name",
    options: [
      { arg: "i", describe: "is it ... ? can be win | linux | mac | centos ..." },
      { arg: "v", describe: "find versions", boolean: true },
      { arg: "c", describe: "codename for ubuntu / debian", boolean: true },
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
      if (util.checkOS("linux")) return cmd("env -i bash -c '. /etc/os-release; echo $VERSION_ID'");
      if (util.checkOS("win")) return console.log(os.version());
      if (util.checkOS("mac")) return cmd("sw_vers -productVersion");
    }

    if (argv.c) {
      if (util.checkOS("ubuntu")) return cmd(`env -i bash -c '. /etc/os-release; echo $VERSION_CODENAME'`);
      if (util.checkOS("debian")) return cmd(`dpkg --status tzdata|grep Provides|cut -f2 -d'-'`);
    }

    console.log({
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      username: os.userInfo().username,
    });
  });

new ucmd("syscheck")
  .describer({
    main: "check system status",
    options: [{ arg: "h", describe: "/health-check api, require url" }],
  })
  .perform(async (argv) => {
    if (argv.h)
      return u.promiseFetchGet(argv.h, {}, {}, 1).catch(() => cu.cmderr("heath-check failed", u.url(argv.h), 1, 1));

    const cpup = new Promise((r) => osu.cpuUsage((p) => r(p)));
    let basic = {
      freeMem: os.freemem() / 1024 / 1024 + "MB",
      totalMem: os.totalmem() / 1024 / 1024 + "MB",
      "freeMem%": osu.freememPercentage() * 100,
      totalCpu: os.cpus().length,
      "cpu%": (await cpup) * 100,
    };
    if (util.checkOS("linux")) {
      let df = u.stringToJson(cmd(`u result -j "df -m"`, false, true));
      let dfResult = df.filter(
        (item) =>
          item.Filesystem != "overlay" && !u.contains(item.Filesystem, "tmp") && u.int(item["1M-blocks"]) > 10000
      );
      basic["fs"] = dfResult;
    }

    if (basic["cpu%"] > 80) console.log("cpu using over", u.int(basic["cpu%"]) + "%");
    if (basic["freeMem%"] < 20 || os.freemem() / 1024 / 1024 < 200)
      console.log("free mem percent:", u.int(basic["freeMem%"]) + "%  ", u.int(basic.freeMem) + "MB left");
    if (basic.fs) {
      for (let i of basic.fs) {
        if (u.int(i["Use%"]) > 80 || i.Available < 1024)
          console.log("disk:", i["Mounted"], i["Use%"], " ", i.Available + "MB left");
      }
    }
  });

new ucmd("helper")
  .describer({
    main: "helper for other commands",
    options: [
      { arg: "n", describe: "name" },
      { arg: "e", describe: "edit with code", boolean: true },
      { arg: "s", describe: "software needs to be preinstalled", boolean: true },
      { arg: "u", describe: "update package", boolean: true },
      { arg: "R", describe: "remove the package", boolean: true },
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
    if (argv.u) return cmd(`cd ${projectPath} && rm -rf package-lock.json && git pull && npm i`);
    if (argv.R)
      return cu.cmdsq("Uninstall ? (N/y)").then((ans) => {
        if (ans == "y" || ans == "Y")
          return cmd(`rm -rf ${projectPath} && rm -rf ~/.bash_mine && rm -rf ~/.bash_env && rm -rf ~/.application`);
      });

    let list = {
      git: {
        "branch remove": "git branch -d $name",
        "graph adog": "git log --all --decorate --oneline --graph",
        "pull on target directory": "git -C $location pull",
        "first time config": "git config --global user.name $name && git config --global user.email $email",
        proxy: {
          get: "git config --global --get http.proxy",
          del: "git config --global --unset http.proxy",
          set: "git config --global http.proxy http://addr:port",
        },
      },
      crontab: {
        edit: "sudo crontab -e",
        "shell support - top of file add": "SHELL=/bin/bash",
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
      rsyslog: {
        restart: "also need to restart systemd-journald",
      },
      nginx: {
        reload: "nginx -s reload",
        "bind-failed": "sudo setenforce 0",
      },
    };
    if (argv.n) console.log(list[argv.n]);
    else console.log(list);
  });

new ucmd().run();
