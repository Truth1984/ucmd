module.exports = {
  env: {
    commonjs: true,
    es2020: true,
    node: true,
    "jest/globals": true,
  },
  extends: "eslint:recommended",
  parserOptions: {
    ecmaVersion: 11,
  },
  plugins: ["jest"],
  rules: {},
};
