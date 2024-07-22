import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "vue3编译原理揭秘",
  description: "通过debug的方式带你搞清楚vue3中的编译黑魔法",

  cleanUrls: true,
  ignoreDeadLinks: true,
  head: [["link", { rel: "icon", href: "/logo.svg" }]],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [{ text: "本书交流群", link: "/guide/contact" }],
    search: {
      provider: "local",
    },
    outline: {
      level: [1, 3],
    },
    sidebar: [
      {
        text: "开始",
        items: [
          {
            text: "导读",
            link: "/guide/get-start",
          },
          {
            text: "如何开始查看源码",
            link: "/guide/start-view-source-code",
          },
          {
            text: "编译时和运行时",
            link: "/guide/compiler-and-runtime",
          },
          {
            text: "vue文件编译成js文件",
            link: "/guide/vue-to-js",
          },
        ],
      },
      {
        text: "template部分",
        items: [
          {
            // 如何将template编译成render函数的？
            text: "baseCompile函数",
            link: "/template/baseCompile",
          },
          {
            text: "parse函数",
            link: "/template/parse",
          },
          {
            // transform函数用于处理内置的v-for、v-model等指令
            text: "transform函数",
            link: "/template/transform",
          },
          {
            text: "编译优化之“靶向更新”",
            link: "/template/patchFlag",
          },
          {
            text: "编译优化之“静态提升”",
            link: "/template/hoistStatic",
          },
          {
            // generate阶段是如何生成render函数的？
            text: "generate函数",
            link: "/template/generate",
          },
          {
            text: "v-bind指令",
            link: "/template/v-bind-template",
          },
          {
            text: "普通组件上面的v-model",
            link: "/template/v-model-component",
          },
          {
            text: "原生input上面的v-model",
            link: "/template/v-model-input",
          },
          {
            text: "template使用ref无需.value",
            link: "/template/template-ref",
          },
        ],
      },
      {
        text: "script部分",
        items: [
          // 宏到底是什么东西？
          { text: "宏函数", link: "/script/what-macros" },
          {
            // setup语法糖到底是什么东西？
            text: "setup函数",
            link: "/script/what-setup",
          },
          {
            // 为什么defineProps宏不需要import导入？
            text: "defineProps",
            link: "/script/defineProps",
          },
          {
            // defineEmits宏是如何工作的？
            text: "defineEmits",
            link: "/script/defineEmits",
          },
          {
            // defineModel是否破坏了单向数据流？
            text: "defineModel",
            link: "/script/defineModel",
          },
          {
            // defineExpose宏如何暴露方法给父组件使用
            text: "defineExpose",
            link: "/script/defineExpose",
          },
          {
            // 为什么template可以直接使用setup语法糖中的变量？
            text: "setup函数导出变量",
            link: "/script/setup-vars",
          },
          {
            // 为什么setup语法糖中的组件无需注册？
            text: "setup函数导出组件",
            link: "/script/setup-component",
          },
        ],
      },
      {
        text: "style部分",
        items: [
          {
            text: "css上面的data-v-xxx",
            link: "/style/scoped-style",
          },
          {
            text: "html上面的data-v-xxx",
            link: "/style/scoped-template",
          },
          {
            text: "style中的v-bind",
            link: "/style/v-bind-style",
          },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/iamouyang21/vue3-complier" },
    ],
  },
});
