import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Vue3 编译原理揭秘",
  description: "Vue3源码解析",
  lang: "zh-CN",
  ignoreDeadLinks: true,
  // head: [["link", { rel: "icon", href: "/logo.svg" } ]],
  // head设置
  head: [
    ["link", { rel: "icon", href: "/logo.svg" }],
    // 添加百度统计代码
    [
      "script",
      {},
      `
      var _hmt = _hmt || [];
      (function() {
        var hm = document.createElement("script");
        hm.src = "https://hm.baidu.com/hm.js?075678ead356cdd6dec49c92b16ca5f1";
        var s = document.getElementsByTagName("script")[0];
        s.parentNode.insertBefore(hm, s);
      })();
    `,
    ],
    [
      "script",
      {
        async: "async",
        src: "https://www.googletagmanager.com/gtag/js?id=G-PSFPPWCBHD",
      },
    ],
    [
      "script",
      {},
      `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-PSFPPWCBHD');
    `,
    ],
    ["meta", { name: "baidu-site-verification", content: "codeva-phM5FSU2JM" }],
    [
      "meta",
      {
        name: "keywords",
        content: "vue3源码、vue源码、vue3编译原理、vue3原理、vue原理",
      },
    ],
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "本书交流群", link: "/guide/contact" },
      {
        text: "欧阳也在找工作，坐标成都求内推！！",
        link: "/guide/contact",
      },
    ],
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
            text: "Vue 文件编译成 JS 文件",
            link: "/guide/vue-to-js",
          },
        ],
      },
      {
        text: "Template 部分",
        items: [
          {
            // 如何将template编译成render函数的？
            text: "baseCompile 函数",
            link: "/template/baseCompile",
          },
          {
            text: "parse 函数",
            link: "/template/parse",
          },
          {
            // transform函数用于处理内置的v-for、v-model等指令
            text: "transform 函数",
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
            text: "generate 函数",
            link: "/template/generate",
          },
          {
            text: "v-bind 指令",
            link: "/template/v-bind-template",
          },
          {
            text: "普通组件上面的 v-model",
            link: "/template/v-model-component",
          },
          {
            text: "原生 input上 面的 v-model",
            link: "/template/v-model-input",
          },
          {
            text: "template 使用 ref 无需 .value",
            link: "/template/template-ref",
          },
        ],
      },
      {
        text: "Script 部分",
        items: [
          // 宏到底是什么东西？
          { text: "宏函数", link: "/script/what-macros" },
          {
            // setup语法糖到底是什么东西？
            text: "setup 函数",
            link: "/script/what-setup",
          },
          {
            // 为什么defineProps宏不需要import导入？
            text: "defineProps",
            link: "/script/defineProps",
          },
          {
            // Vue3.5中解构props，让父子组件通信更加丝滑
            text: "响应式 Props 解构",
            link: "/script/definePropsDestructure",
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
            text: "setup 函数导出变量",
            link: "/script/setup-vars",
          },
          {
            // 为什么setup语法糖中的组件无需注册？
            text: "setup 函数导出组件",
            link: "/script/setup-component",
          },
        ],
      },
      {
        text: "Style 部分",
        items: [
          {
            text: "CSS 上面的 data-v-xxx",
            link: "/style/scoped-style",
          },
          {
            text: "HTML 上面的 data-v-xxx",
            link: "/style/scoped-template",
          },
          {
            text: "Style 中的 v-bind",
            link: "/style/v-bind-style",
          },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/iamouyang21/vue3-complier" },
    ],
    lastUpdated: {
      text: "最后更新于",
    },
    footer: {
      copyright: " ICP备案号：蜀ICP备2024091035号-1",
    },
  },
  sitemap: {
    hostname: "https://vue-compiler.iamouyang.cn",
  },
  lastUpdated: true,
  markdown: {
    config(md) {
      const defaultCodeInline = md.renderer.rules.code_inline!;
      md.renderer.rules.code_inline = (tokens, idx, options, env, self) => {
        tokens[idx].attrSet("v-pre", "");
        return defaultCodeInline(tokens, idx, options, env, self);
      };
    },
  },
  transformPageData(pageData) {
    const canonicalUrl =
      `https://vue-compiler.iamouyang.cn/${pageData.relativePath}`
        .replace(/index\.md$/, "")
        .replace(/\.md$/, ".html");

    pageData.frontmatter.head ??= [];
    pageData.frontmatter.head.push([
      "link",
      { rel: "canonical", href: canonicalUrl },
    ]);
  },
});
