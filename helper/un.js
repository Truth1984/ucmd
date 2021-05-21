const uuid = require("uuid");
const fs = require("fs");
const fsp = fs.promises;
const fse = require("fs-extra");
const iconv = require("iconv-lite");
const paths = require("path");
const download = require("download");
const readdir = require("readdirp");
const u = require("awadau");

let un = {};

un.uuid = (v4 = true) => (v4 ? uuid.v4() : uuid.v1());

un.filePathNormalize = (...path) =>
  u.stringReplace(paths.normalize(paths.join(...path)), { "~": process.env.HOME, "\\\\\\\\": "/", "\\\\": "/" });

un.filePathAnalyze = (...path) => {
  path = un.filePathNormalize(...path);
  let full = paths.resolve(path);
  return {
    dirname: paths.dirname(path),
    current: path,
    full: {
      current: full,
      dirname: paths.dirname(full),
      basename: paths.basename(full),
    },
    basename: paths.basename(path),
    ext: paths.extname(path),
  };
};

un.fileExist = (path) => {
  path = un.filePathNormalize(path);
  return fs.existsSync(path);
};

/**
 * @return {Boolean}
 */
un.fileIsDir = (path) => {
  path = un.filePathNormalize(path);
  return fs.existsSync(path) && fs.lstatSync(path).isDirectory();
};

un.filels = async (path, fullPath = false) => {
  path = un.filePathNormalize(path);
  return fsp.readdir(path).then((data) => {
    if (fullPath) return data.map((value) => paths.resolve(path, value));
    return data;
  });
};

un.fileSize = async (path) => {
  path = un.filePathNormalize(path);
  return fsp.stat(path).then((data) => data.size / 1e6);
};

un.fileMkdir = (path, recursive = true) => {
  path = un.filePathNormalize(path);
  if (fs.existsSync(path)) return Promise.resolve(true);
  return fsp.mkdir(path, { recursive });
};

un.fileMove = async (source, target, mkdir = true, overwrite = true) => {
  source = un.filePathNormalize(source);
  target = un.filePathNormalize(target);
  if (mkdir) fse.mkdirpSync(paths.dirname(target));
  return fse.moveSync(source, target, { overwrite });
};

/**
 * 
 * @param {string} path 
 * @param {{root?: string;
    fileFilter?: string | string[] | ((entry: EntryInfo) => boolean);
    directoryFilter?: string | string[] | ((entry: EntryInfo) => boolean);
    type?: 'files' | 'directories' | 'files_directories' | 'all';
    lstat?: boolean;
    depth?: number;
    alwaysStat?: boolean;}} option 
 */
un.fileReaddir = async (path, option) => {
  return readdir.promise(un.filePathNormalize(path), option);
};

un.fileLatestDir = (path) => {
  return un.fileIsDir(path) ? path : paths.dirname(path);
};

un.fileWrite = async (content, appendOrNot = false, path, encode = "utf8") => {
  path = un.filePathNormalize(path);
  return un
    .fileMkdir(paths.dirname(path))
    .then(() =>
      Buffer.isBuffer(content)
        ? fsp.writeFile(path, content, { flag: appendOrNot ? "a+" : "w+", encoding: "binary" })
        : fsp.writeFile(path, iconv.encode(content, encode), { flag: appendOrNot ? "a+" : "w+" })
    );
};

un.fileWriteSync = (content, appendOrNot = false, path, encode = "utf8") => {
  path = un.filePathNormalize(path);
  un.fileMkdir(paths.dirname(path));
  return Buffer.isBuffer(content)
    ? fs.writeFileSync(path, content, { flag: appendOrNot ? "a+" : "w+", encoding: "binary" })
    : fs.writeFileSync(path, iconv.encode(content, encode), {
        flag: appendOrNot ? "a+" : "w+",
      });
};

un.fileRead = async (path, encode = "utf8") => {
  path = un.filePathNormalize(path);
  return fsp.readFile(path, encode);
};

un.fileReadSync = (path, encode = "utf8") => {
  path = un.filePathNormalize(path);
  return fs.readFileSync(path, encode).toString();
};

/**
 * @return {Promise<Buffer>}
 */
un.fileReadBuffer = async (path) => {
  path = un.filePathNormalize(path);
  return fsp.readFile(path, "binary");
};

un.fileDelete = async (path, trash = false) => {
  path = un.filePathNormalize(path);
  if (trash) return un.cmd(`trash ${path}`);
  return fsp.unlink(path);
};

/**
 *
 * @typedef {import('download').DownloadOptions} DownloadOptions
 * @param {string} url
 * @param {string} outputPath
 * @param {DownloadOptions} opt
 * @return {Promise<{}>} headers
 */
un.fileDownload = async (url, outputPath, opt = {}) => {
  url = u.url(url);
  outputPath = un.filePathNormalize(outputPath);
  let dobj = download(url, undefined, opt);
  let headers;
  dobj.on("response", (res) => (headers = Promise.resolve(res.headers)));
  let stream = dobj.pipe(fs.createWriteStream(outputPath));
  return new Promise((resolve, reject) => {
    stream.on("close", () => resolve(headers));
    stream.on("error", (e) => reject(e));
  });
};

un.fileStat = (path) => fs.statSync(un.filePathNormalize(path));

module.exports = un;
