// 项目基本配置
module.exports = {
  //此项是用来告诉eslint找当前配置文件不能往父级查找
  root: true,
  env: { // 全局环境
    browser: true,
    es2021: true, // 例子：这样设置之后，就支持新的 ES6 全局变量和类型
    node: true, // 例子：这样设置之后，就支持新的 node 全局变量和类型
  },
  parserOptions: {  // 优先级低于parse的语法解析配置
    ecmaVersion: 2020, // 允许使用ES语法
    sourceType: 'module', // 允许使用import
  },
  extends: [ // 让 ESlint 添加规则模块
    'eslint:recommended', // 启用 ESLint 核心规则，这些规则报告一些常见问题。
    'plugin:vue/essential', // 例子：让 ESlint 能检查vue相关代码语法  vue2
    // 'plugin:vue/vue3-essential', // vue3
  ],
  rules: {      
    // 禁用 alert、confirm、prompt、console、debugger      
    // "no-alert": process.env.NODE_ENV === "production" ? "warn" : "off",      
    // "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",      
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",      
    'eqeqeq':'warn',  // 要求使用 === 和 !==      
    'no-dupe-args': 'error', // 禁止 function 定义中出现重名参数      
    'no-dupe-keys': 'error', // 禁止对象字面量中出现重复的 key      
    'no-eval': 'error', // 禁用 eval()      
    'no-self-compare': 'error', // 禁止自身比较      
    'no-self-assign': 'error', // 禁止自我赋值      
    'no-unused-vars': 0,  // 禁止出现未使用过的变量      
    'no-const-assign': 'error',  // 禁止修改 const 声明的变量      
    'no-func-assign': 'error',  // 禁止对 function 声明重新赋值      
    'camelcase': 0,  // 强制使用骆驼拼写法命名约定
    'no-mixed-spaces-and-tabs': 'error', //禁止混用tab和空格      
    'indent': ['warn', 2], //缩进风格这里不做硬性规定，但是产品组内要达成统一      
    'quotes': ['warn', 'single'], //要求引号类型 `` " ""
    'semi': ['error', 'always'], //语句强制分号结尾
    // 单文件名报错
    'vue/multi-word-component-names': [
      'error',
      {
        ignores: ['index', 'Menu', 'popup', 'head', 'admin', 'Foot'] // 需要忽略的组件名
      }
    ]
    //  'vue/multi-word-component-names': 0    直接关闭单文件名称检查
  },
};