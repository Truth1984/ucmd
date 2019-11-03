var yargs = require("yargs");

module.exports = class ucmd {
  constructor(main, ...options) {
    this.main = main;
    this.options = options;
    this._result = [];
  }

  /**
   * @param {{main:string,options:[{arg:string, describe:string, default:any}]|{arg:string, describe:string, default:any}}} description
   */
  describer(description) {
    if (this.options.length == 0) {
      this._result = [this.main, description.main, () => {}];
    } else {
      this._result = [
        this.main,
        description.main,
        args => {
          if (Array.isArray(description.options)) for (let i of description.options) args.positional(i.arg, i);
          else args.positional(description.options.arg, description.options);
        }
      ];
    }
    return this;
  }

  /**
   *
   * @param {(argv:{[argName: string]: unknown;_: string[];$0: string;})=>{}} argv
   */
  perform(argv) {
    if (this._result.length == 0) this.describer({ main: "program command" });
    this._result.push(argv);
    yargs.command(...this._result).argv;
    return this;
  }
};
