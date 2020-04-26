var readline = require("readline");
var { Writable } = require("stream");

let _cmdReadInputHelper = async (ask = "", private = true) => {
  let muted = false;
  const rl = readline.createInterface({
    input: process.stdin,
    output: new Writable({
      write: (chunk, encoding, callback) => {
        if (!muted) process.stdout.write(chunk, encoding);
        callback();
      },
    }),
    terminal: true,
  });

  return new Promise((resolve) => {
    rl.question(ask + "\n", (answer) => {
      rl.close();
      resolve(answer);
    });
    muted = private;
  });
};

/**
 * @param askPrivate \{questionsToAsk:DisplayOnScreenBoolean\}
 * @return {Promise<Array>}
 */
module.exports = async (askPrivate = {}) => {
  let result = [];
  for (let i in askPrivate) {
    await _cmdReadInputHelper(i, askPrivate[i]).then((data) => {
      result = [].concat(result, data);
    });
  }
  return Promise.resolve(result);
};
