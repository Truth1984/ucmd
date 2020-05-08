var { spawnSync } = require("child_process");

module.exports = (scripts, log, returnable = false) => {
  if (log) console.log(scripts);
  let cmdarray = scripts.split(" ");
  return spawnSync(cmdarray.shift(), cmdarray, {
    shell: true,
    stdio: returnable ? "pipe" : "inherit",
    encoding: "utf-8",
    env: process.env,
  }).stdout;
};
