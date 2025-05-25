const path = require('path');

module.exports = {
    mode: 'production',
    entry: './javascript/script.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.scss$/,
                use: ['style-loader', 'css-loader', 'sass-loader'],
            }
        ],
    },
    resolve: {
        fallback: {
            "path": require.resolve("path-browserify"),
            "os": require.resolve("os-browserify/browser"),
            "crypto": false,
            "stream": require.resolve("stream-browserify"),
            "buffer": require.resolve("buffer/"),
            "util": require.resolve("util/"),
            "fs": false,
            "net": false,
            "tls": false,
            "dns": false,
            "pg-native": false
        }
    },
    target: 'web',
    node: {
        __dirname: true,
        global: true
    }
};