全て日本語で。

tmuxが使えるのでペインを分けて並列で行うことができます。cxdでcodexが呼び出せますのでそれに指示することで実装が並列でできます。
git worktreeも活用してください。

実装が終わったら適切にコミット（一括でコミットしないなど）、pushしてください。そしてprも出してください。

app/routes/home.tsxとするとexample.com/homeになります。

 app/
├── routes/
│   ├── _index.tsx→/
│   ├── about.tsx→/about
│   ├── concerts.trending.tsx
│   ├── concerts.salt-lake-city.tsx　→/concerts/salt-lake-city	
│   └── concerts.$city.tsx→/concerts/salt-lake-city
└── root.tsx