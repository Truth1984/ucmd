var yargs = require("yargs");

var middleware = [];

module.exports = class ucmd {
  constructor(main, ...options) {
    this.main = main;
    this.options = options;
    this._result = [];
  }

  /**
   * @typedef {{main:string,options:[{arg:string, describe:string, default:any, boolean:boolean, array:boolean, alias:any}} yopt
   *
   * @param {[yopt]|yopt} description
   */
  describer(description) {
    if (!description.options) description.options = [];
    this._result = [
      this.main,
      description.main,
      (args) => {
        if (Array.isArray(description.options))
          for (let i in description.options) {
            if (description.options[i].boolean) {
              delete description.options[i]["boolean"];
              description.options[i].type = "boolean";
            }
            args.positional(description.options[i].arg, description.options[i]).check((argv) => {
              if (argv._[Number.parseInt(i) + 1] != undefined)
                argv[description.options[i].arg] = argv._[Number.parseInt(i) + 1];
              return true;
            });
          }
        else args.positional(description.options.arg, description.options);
      },
    ];
    return this;
  }

  /**
   *
   * @param {(argv:{[argName: string]: unknown;_: string[];$0: string;})=>{}} argv
   */
  perform(argv) {
    if (this._result.length == 0) this.describer({ main: "program command" });
    this._result.push(argv);
    middleware.push(this._result);
    this._result = [];
    return this;
  }

  run() {
    yargs = yargs.parserConfiguration({ "parse-numbers": false });
    for (let i of middleware) yargs = yargs.command(...i);
    yargs.argv;
    return this;
  }
};
