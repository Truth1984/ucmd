var ffmpeg = require("fluent-ffmpeg"),
  download = require("download"),
  fs = require("fs"),
  units = require("convert-units"),
  fsp = fs.promises;

let dl = {};

dl._interval = path => {
  return setInterval(
    () =>
      fsp
        .stat(path)
        .then(data =>
          units(data.size)
            .from("B")
            .to("MB")
        )
        .then(data => console.log(path, "fileSize: ", data))
        .catch(e => console.log("error", e)),
    1000 * 30
  );
};

dl.m3u8 = (urlOrFile, path) => {
  let interval = dl._interval(path);

  return new Promise((resolve, reject) => {
    ffmpeg(urlOrFile)
      .on("error", error => {
        reject(urlOrFile + "\n" + error.stack);
      })
      .on("end", () => {
        resolve("download complete");
      })
      .outputOptions("-c copy")
      .outputOptions("-bsf:a aac_adtstoasc")
      .output(path)
      .run();
  })
    .then(data => {
      clearInterval(interval);
      return data;
    })
    .catch(e => {
      clearInterval(interval);
      return Promise.reject(e);
    });
};

dl.download = (url, path) => {
  let stream = download(url).pipe(fs.createWriteStream(path));
  let interval = dl._interval(path);
  return new Promise(resolve => stream.on("close", () => resolve(true)))
    .then(() => clearInterval(interval))
    .catch(e => {
      clearInterval(interval);
      return Promise.reject(e);
    });
};

module.exports = dl;
