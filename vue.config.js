const { defineConfig } = require('@vue/cli-service');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require("path"); // 路径组件。
const webpack = require("webpack");
module.exports = defineConfig({
  transpileDependencies: true,
  // lintOnSave: false, // eslint不检测, 不报错
  publicPath: './',
  configureWebpack: {
    plugins: [new NodePolyfillPlugin()],
  },
  chainWebpack: config => {
		config.module
			.rule('worker')
			.test(/\.webWorker\.js$/)
			.use('worker')
			.loader('worker-loader')
            // .options({ inline: 'fallback' }) // 这个配置是个坑，不要加
	}
});



// const { defineConfig } = require('@vue/cli-service')
// const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')
// const CopyWebpackPlugin = require('copy-webpack-plugin');
// module.exports = defineConfig({
//   transpileDependencies: true,
//   // chainWebpack: config => {
// 	// 	config.module
// 	// 		.rule('worker')
// 	// 		.test(/\.worker\.js$/)
// 	// 		.use('worker')
// 	// 		.loader('worker-loader')
//   //           // .options({ inline: 'fallback' }) // 这个配置是个坑，不要加
// 	// }
//   chainWebpack(config) {
//     // set worker-loader
//     config.module
//       .rule('worker')
//       .test(/\.worker\.js$/)
//       .use('worker-loader')
//       .loader('worker-loader')
//       .end();

//     // 解决：worker 热更新问题
//     config.module.rule('js').exclude.add(/\.worker\.js$/);
//   },
//   parallel: false,
//   // chainWebpack: config => {
//   //   // 解决：“window is undefined”报错，这个是因为worker线程中不存在window对象，因此不能直接使用，要用this代替
//   //   config.output.globalObject('this')
//   // }
//   configureWebpack: {
//     plugins: [new NodePolyfillPlugin()],
//   }
// })
