var { spawnSync } = require("child_process");

let UDATA = process.env.HOME + "/.application";

module.exports = (scripts, log, returnable = false) => {
  if (log) console.log(scripts);
  let cmdarray = scripts.split(" ");
  return spawnSync(cmdarray.shift(), cmdarray, {
    shell: true,
    stdio: returnable ? "pipe" : "inherit",
    encoding: "utf-8",
    env: Object.assign(process.env, { UDATA }),
  }).stdout;
};
