var ucmd = require("../helper/_helper");
var cmd = require("../helper/_cmd");
const u = require("awadau");
const cu = require("cmdline-util");

new ucmd("_test").perform((argv) => console.log("testing"));

new ucmd("_author").perform(() => console.log("Awada.Z"));

new ucmd("_home").perform(() => cmd("echo ~", true));

new ucmd("_ask").describer({ main: "asking test" }).perform(async (argv) => {
  let name = await cu.cmdsq("what is your name");
  let pw = await cu.cmdsq("your password", true);
  console.log({ name, pw });
});

new ucmd("_do", "task")
  .describer({ main: "pipe task", options: [{ arg: "t", describe: "task to pipe", alias: "pipe" }] })
  .perform((argv) => cmd(argv.t));

new ucmd("_echo", "line").describer({ main: "echo cmd", options: [{ arg: "l", describe: "line" }] }).perform((argv) => {
  console.log(argv.l);
  cmd(`echo '${argv.l}'`);
});

new ucmd("_debug").describer({ main: "debug mode" }).perform((argv) => console.log("UDEBUG=1"));

new ucmd("_webtest", "port")
  .describer({
    main: "test docker",
    options: [
      { arg: "p", describe: "port to open", default: "8080" },
      { arg: "r", describe: "remove service" },
      { arg: "e", describe: "execute inside target container" },
    ],
  })
  .perform((argv) => {
    if (argv.r) return cmd(`u docker -r=web-test`);
    if (argv.e) return cmd(`u docker -e=web-test,sh`);

    return cmd(`sudo docker run -d --name web-test -p ${argv.p}:8000 crccheck/hello-world`);
  });
