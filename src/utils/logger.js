const chalk = require('chalk');

exports._timestamp = () => new Date().toLocaleString();

module.exports.log = (...args) => {
  console.log(`${chalk.cyan.bold(`[${this._timestamp()}]`)} ${args}`);
}

module.exports.error = (...args) => {
  console.log(chalk.red.bold(`[ERROR] [${this._timestamp()}]`));
  console.warn(...message);
  console.log(chalk.red.bold(`[/ERROR]`));
};

module.exports.important = (...args) => {
  console.log(`${chalk.red.bold(`[${this._timestamp()}]`)} ${args}`);
}