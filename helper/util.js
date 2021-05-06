const cmd = require("./_cmd");
const u = require("awadau");

let util = {};

util.checkOS = (name) => cmd(`u os ${name}`, false, true).trim() == "true";

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
  if (u.reCommonFast().ipv4.test(pattern)) return [pattern];
  let rawline = cmd(
    `ansible -i ${util.ansibleConf.inventory_location} --list-hosts ${pattern} | tail -n +2`,
    false,
    true
  );
  return u.stringToArray(u.stringReplace(rawline, { "\n": ",", " ": "", ",$": "" }), ",").filter((a) => a != "");
};

util.ansibleInventoryData = (pattern = "all") => {
  if (pattern == true) pattern = "all";

  let result = cmd(`ansible-inventory -i ${util.ansibleConf.inventory_location} --host ${pattern}`, false, true, true);
  if (result.status == 0) return u.stringToJson(result.stdout);

  let { user, port, addr } = util.sshGrep(pattern);
  return {
    u_name: "unknown",
    u_describe: "unknown",
    ansible_user: user,
    ansible_port: port,
    addr,
  };
};

module.exports = util;
