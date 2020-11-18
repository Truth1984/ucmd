var { spawnSync } = require("child_process");
const u = require("awadau");

let UDATA = process.env.HOME + "/.application";
let DIR = __dirname + "/..";

module.exports = (scripts, log, returnable = false) => {
  if (log) console.log(scripts);
  scripts = u.stringReplace(scripts, {"~":process.env.HOME})
  let cmdarray = scripts.split(" ");
  return spawnSync(cmdarray.shift(), cmdarray, {
    shell: true,
    stdio: returnable ? "pipe" : "inherit",
    encoding: "utf-8",
    env: Object.assign(process.env, { UDATA, DIR }),
  }).stdout;
};
