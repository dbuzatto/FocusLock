const path = require('path');

module.exports = {
  entry: './src/renderer/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'renderer.js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  target: 'electron-renderer',
};
