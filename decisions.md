# Decisions

- Using TypeScript because I want to learn it and get used to it.
- Using Deno because no messing around with Webpack.
- Using Oak because it seems well-supported and works, but open to alternatives.
- Working with CSV files since they are easy for a human to edit and share,
  even though JSON or YAML makes more sense structurally.
- Using classes for string generation, since they require a one-time setup to load the CSV data,
  and can then be called multiple times without passing in the data every time.
  Could also use closures though; probably minimal difference either way.
