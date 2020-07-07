/**
 * 
 * shellOutput: the string resulting from running your command
options.separator: which character separates your tabled data, default is one space
options.skipLines: how many lines to skip before meeting the columns definition header
 * 
 * @param {{separator:" ",skipLines:0}} options 
 */
module.exports = (output, options) => {
  options = options || {};
  let separator = options.separator || " ";
  let lines = output.split("\n");

  if (options.skipLines > 0) lines.splice(0, options.skipLines);

  let headers = lines.shift();
  let splitHeader = headers.split(separator);

  let limits = [];

  for (let i = 0; i < splitHeader.length; i++) {
    let colName = splitHeader[i].trim();

    if (colName !== "") {
      limits.push({ label: colName, start: headers.indexOf(colName) });
    }
  }

  let table = lines.map((line) => {
    if (line) {
      let result = {};

      for (let key in limits) {
        let header = limits[key];
        let nextKey = parseInt(key, 10) + 1;
        let start = key === "0" ? 0 : header.start;
        let end = limits[nextKey] ? limits[nextKey].start - start : undefined;

        result[header.label] = line.substr(start, end).trim();
      }

      return result;
    }
  });

  table[table.length - 1] === undefined && table.pop();

  return table;
};
