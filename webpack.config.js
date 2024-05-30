const path = require("path")
const HtmlWbpack = require("html-webpack-plugin")
module.exports = {
    mode: "production",
    entry: "./src/index.js",
    output: {
        path: path.resolve(__dirname, "dist"),
        clean: true
    },
    // loader  加载器
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"]
            },
            {
                test: /\.m?js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                  loader: 'babel-loader',
                  options: {
                    presets: ['@babel/preset-env']
                  }
                }
            },
            {
                test: /.worker.js$/,  // 匹配所有的xxx.worker.js
                loader: 'worker-loader'
            }
        ]
    },
    plugins: [
        new HtmlWbpack({
            title: "测试一下"
        })
    ],
    devtool: "inline-source-map"
}