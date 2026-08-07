import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    ignores: [
      "client/**",
      "public/**",
      "node_modules/**"
    ]
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        require: "readonly",
        module: "readonly",
        console: "readonly",
        Buffer: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^(req|res|next|err)$" }],
      "no-undef": "error",
      "no-unreachable": "error"
    }
  }
];
