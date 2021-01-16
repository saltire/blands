module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'airbnb-base',
    'plugin:import/typescript',
  ],
  rules: {
    'arrow-parens': [2, 'as-needed'],
    'brace-style': [2, 'stroustrup'],
    'dot-notation': [2, { allowKeywords: true, allowPattern: '^_' }],
    'function-paren-newline': 0,
    'import/extensions': [2, 'never'],
    'no-cond-assign': [2, 'except-parens'],
    'no-console': 0,
    'no-multi-assign': 0,
    'no-multiple-empty-lines': [2, { max: 2, maxBOF: 0, maxEOF: 0 }],
    'no-nested-ternary': 0,
    'no-unused-vars': 0,
    'object-curly-newline': [2, { multiline: true, consistent: true }],
    'operator-linebreak': [2, 'after'],
    radix: [2, 'as-needed'],
    strict: [2, 'global'],
    '@typescript-eslint/no-unused-vars': 2,
  },
  overrides: [
    { files: '*.ts' },
  ],
};
