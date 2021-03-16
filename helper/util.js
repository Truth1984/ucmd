const cmd = require("./_cmd");
const cmdq = require("../helper/_cmdQs");
const u = require("awadau");

let util = {};

util.multiSelect = async (listsOrStr, index = 0, logfirst = true, exit = true) => {
  let l = listsOrStr;
  if (u.typeCheck(l, "str")) return l;
  if (u.len(l) == 0) return l;
  if (logfirst) console.log(u.arrayToMap(Array.from(l.keys()), Array.from(l.values())));
  return cmdq({ [`multiple sources found, using [${index}] {${l[index]}} ? (y / INDEX / n)`]: false }).then((ans) => {
    if (ans == "" || ans == "y" || ans == "Y") {
      if (l[index] == undefined && exit) {
        console.error("Error: exit due to key is undefined");
        process.exit(1);
      }
      return l[index];
    }
    if (!Number.isNaN(u.int(ans))) return util.multiSelect(l, u.int(ans), false);
    process.exit(1);
  });
};

util.sshGrep = (str) => {
  let user = "root";
  let addr = "";
  let port = 22;
  if (u.contains(str, ["@", ":"])) {
    user = u.refind(str, u.regexBetweenOut("^", "@"));
    addr = u.refind(str, u.regexBetweenOut("@", ":"));
    port = u.refind(str, u.regexBetweenOut(":", "$"));
  } else if (u.contains(str, "@")) {
    user = u.refind(str, u.regexBetweenOut("^", "@"));
    addr = u.refind(str, u.regexBetweenOut("@", "$"));
  } else if (u.contains(str, ":")) {
    addr = u.refind(str, u.regexBetweenOut("^", ":"));
    port = u.refind(str, u.regexBetweenOut(":", "$"));
  } else {
    addr = str;
  }
  return { user, addr, port };
};

util.ansibleConf = {
  inventory_location: process.env.HOME + `/.application/ansible/hosts`,
  playbookdir: __dirname + "/../bin/playbook.yml",
};

util.ansibleGetUserRawEcho = (pattern = "all") => {
  if (pattern == true) pattern = "all";
  return cmd(`ansible -i ${util.ansibleConf.inventory_location} --list-hosts ${pattern}`);
};

util.ansibleGetUserList = (pattern = "all") => {
  if (pattern == true) pattern = "all";
  let rawline = cmd(
    `ansible -i ${util.ansibleConf.inventory_location} --list-hosts ${pattern} | tail -n +2`,
    false,
    true
  );
  return u.stringToArray(u.stringReplace(rawline, { "\n": ",", " ": "", ",$": "" }), ",").filter((a) => a != "");
};

util.ansibleInventoryData = (pattern = "all") => {
  if (pattern == true) pattern = "all";
  return u.stringToJson(
    u.isBadAssign(
      cmd(`ansible-inventory -i ${util.ansibleConf.inventory_location} --host ${pattern}`, false, true),
      "{}"
    )
  );
};

module.exports = util;
