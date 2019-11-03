var { spawnSync } = require("child_process");

module.exports = (scripts, log) => {
  if (log) console.log(scripts);
  let cmdarray = scripts.split(" ");
  return spawnSync(cmdarray.shift(), cmdarray, {
    shell: true,
    stdio: "inherit",
    encoding: "utf-8"
  });
};
