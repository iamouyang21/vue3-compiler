import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "vue3编译原理揭秘",
  description: "通过debug的方式带你搞清楚vue3中的黑魔法",
  cleanUrls: true,
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
            text: "如何开始查看源码",
            link: "/guide/start-view-source-code",
          },
          {
            text: "编译时和运行时的区别",
            link: "/guide/compiler-and-runtime",
          },
          {
            text: "一个vue文件是如何编译成js文件的？",
            link: "/guide/vue-to-js",
          },
        ],
      },
      {
        text: "template部分",
        items: [
          {
            text: "如何将template编译成render函数的？",
            link: "/template/template-to-render",
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
            text: "为什么template使用ref无需.value？",
            link: "/template/template-ref",
          },
          {
            text: "v-bind指令工作原理",
            link: "/template/v-bind-template",
          },
          {
            text: "普通组件上面的v-model是怎么实现的？",
            link: "/template/v-model-base",
          },
          {
            text: "原生input上面的v-model是怎么实现的？",
            link: "/template/v-model-raw",
          },
        ],
      },
      {
        text: "script部分",
        items: [
          { text: "宏到底是什么东西？", link: "/script/what-macros" },
          {
            text: "setup语法糖到底是什么东西？",
            link: "/script/what-setup",
          },
          {
            text: "为什么defineProps宏不需要import导入？",
            link: "/script/defineProps",
          },
          {
            text: "defineEmits宏是如何工作的？",
            link: "/script/defineEmits",
          },
          {
            text: "defineModel是否破坏了单向数据流？",
            link: "/script/defineModel",
          },
          {
            text: "defineExpose宏如何暴露方法给父组件使用",
            link: "/script/defineExpose",
          },
          {
            text: "为什么template可以直接使用setup语法糖中的变量？",
            link: "/script/setup-vars",
          },
          {
            text: "为什么setup语法糖中的组件无需注册？",
            link: "/script/setup-component",
          },
        ],
      },
      {
        text: "style部分",
        items: [
          {
            text: "scoped避免样式污染之css部分",
            link: "/style/scoped-style",
          },
          {
            text: "scoped避免样式污染之html部分",
            link: "/style/scoped-template",
          },
          {
            text: "使用v-bind在style中使用响应式变量",
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
