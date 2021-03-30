var { spawnSync } = require("child_process");
const u = require("awadau");

let UDATA = process.env.HOME + "/.application";
let DIR = __dirname + "/..";

module.exports = (scripts, log, returnable = false, full = false) => {
  if (log || process.env.UDEBUG) console.log(scripts);
  let cmdarray = scripts.split(" ");
  return full
    ? spawnSync(cmdarray.shift(), cmdarray, {
        shell: true,
        stdio: "pipe",
        encoding: "utf-8",
        env: Object.assign(process.env, { UDATA, DIR }),
      })
    : spawnSync(cmdarray.shift(), cmdarray, {
        shell: true,
        stdio: returnable ? "pipe" : "inherit",
        encoding: "utf-8",
        env: Object.assign(process.env, { UDATA, DIR }),
      }).stdout;
};
