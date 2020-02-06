var fs = require("fs"),
  paths = require("path");

let qr = {};
qr.quickPath = paths.join(__dirname, "../quick");
if (!fs.existsSync(qr.quickPath)) fs.mkdirSync(qr.quickPath);

qr.record = (name, cmd) => {
  fs.writeFileSync(paths.join(qr.quickPath, name), cmd);
};

qr.perform = name => {
  let cmdPath = paths.join(qr.quickPath, name);
  if (fs.existsSync(cmdPath)) return fs.readFileSync(cmdPath).toString();
  return `echo <quick> ${name} undefined`;
};

qr.display = () => {
  let result = {};
  for (let i of fs.readdirSync(qr.quickPath))
    result[i] = fs.readFileSync(paths.join(qr.quickPath, i)).toString();
  console.table(result);
};

qr.remove = name => {
  let target = paths.join(qr.quickPath, name);
  if (fs.existsSync(target)) fs.unlinkSync(target);
};

module.exports = qr;
