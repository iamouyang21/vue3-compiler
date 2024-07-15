# 前言
我们每天都在用`v-model`，并且大家都知道在vue3中`v-model`是`:modelValue`和`@update:modelValue`的语法糖。那你知道`v-model`指令是如何变成组件上的`modelValue`属性和`@update:modelValue`事件呢？将`v-model`指令转换为`modelValue`属性和`@update:modelValue`事件这一过程是在编译时还是运行时进行的呢？
# 先说结论
下面这个是我画的处理`v-model`指令的完整流程图：
![vModel-progress](https://img2024.cnblogs.com/blog/1217259/202403/1217259-20240325103700194-1393024933.png)


首先会调用`parse`函数将template模块中的代码转换为AST抽象语法树，此时使用`v-model`的node节点的props属性中还是`v-model`。接着会调用`transform`函数，经过`transform`函数处理后在`node`节点中多了一个`codegenNode`属性。在`codegenNode`属性中我们看到没有`v-model`指令，取而代之的是`modelValue`和`onUpdate:modelValue`属性。经过`transform`函数处理后已经将`v-model`指令编译为`modelValue`和`onUpdate:modelValue`属性，此时还是AST抽象语法树。所以接下来就是调用`generate`函数将AST抽象语法树转换为`render`函数，到此为止编译时做的事情已经做完了，**经过编译时的处理`v-model`指令已经变成了`modelValue`和`onUpdate:modelValue`属性。**

接着就是运行时阶段，在浏览器中执行`render`函数生成虚拟DOM。在生成虚拟DOM的过程中由于props属性中有`modelValue`和`onUpdate:modelValue`属性，所以就会给组件对象加上`modelValue`属性和`@update:modelValue`事件。最后就是调用`mount`方法将虚拟DOM转换为真实DOM。**所以`v-model`指令转换为`modelValue`属性和`@update:modelValue`事件这一过程是在编译时进行的。**
# 什么是编译时？什么是运行时？
vue是一个编译时+运行时一起工作的框架，之前有小伙伴私信我说自己傻傻分不清楚在vue中什么时候是编译时，什么时候是运行时。要回答小伙伴的这个问题我们要从一个vue文件是如何渲染到浏览器窗口中说起。

我们的vue代码一般都是写在后缀名为vue的文件上，显然浏览器是不认识vue文件的，浏览器只认识html、css、jss等文件类型。所以第一步就是通过webpack或者vite将一个vue文件编译为一个包含`render`函数的js文件，在这一步中代码的执行环境是在nodejs中进行，也就是我们所说的编译时。相比浏览器端来说能够拿到的权限更多，也能做更多的事情。后面就是执行`render`函数生成虚拟DOM，再调用浏览器的DOM API根据虚拟DOM生成真实DOM挂载到浏览器上。在第一步后面的这些过程中代码执行环境都是在浏览器中，也就是我们所说的运行时。在客户端渲染的场景下，一句话总结就是：代码跑在nodejs端的时候就是编译时，代码跑在浏览器端的时候就是运行时。
![full-progress](https://img2024.cnblogs.com/blog/1217259/202403/1217259-20240325103719614-563668505.png)

# 举个例子
我们来看一个`v-model`的例子，父组件`index.vue`的代码如下：
```
<template>
  <CommonChild v-model="inputValue" />
  <p>input value is: {{ inputValue }}</p>
</template>

<script setup lang="ts">
import { ref } from "vue";
import CommonChild from "./child.vue";

const inputValue = ref();
</script>
```
我们上面是一个很简单的`v-model`的例子，在`CommonChild`子组件上使用`v-model`绑定一个叫`inputValue`的ref变量，然后将这个`inputValue`变量渲染到p标签上面。

前面我们已经讲过了客户端渲染的场景下，在nodejs端工作的时候是编译时，在浏览器端工作的时候是运行时。那我们现在先来看看经过`编译时`阶段处理后，刚刚进入到浏览器端`运行时`阶段的js代码是什么样的。我们要如何在浏览器中找到这个js文件呢？其实很简单直接在network上面找到你的那个vue文件就行了，比如我这里的文件是`index.vue`，那我只需要在network上面找叫`index.vue`的文件就行了。但是需要注意一下network上面有两个`index.vue`的js请求，分别是template模块+script模块编译后的js文件，和style模块编译后的js文件。

那怎么区分这两个`index.vue`文件呢？很简单，通过query就可以区分。由style模块编译后的js文件的URL中有type=style的query，如下图所示：
![network](https://img2024.cnblogs.com/blog/1217259/202403/1217259-20240325103733144-1392083317.png)


这时有的小伙伴就开始疑惑了不是说好的浏览器不认识vue文件吗？怎么这里的文件名称是`index.vue`而不是`index.js`呢？其实很简单，在开发环境时`index.vue`文件是在`App.vue`文件中import导入的，而`App.vue`文件是在`main.js`文件中import导入的。所以当浏览器中执行`main.js`的代码时发现import导入了`App.vue`文件，那浏览器就会去加载`App.vue`文件。当浏览器加载完`App.vue`文件后执行时发现import导入了`index.vue`文件，所以浏览器就会去加载`index.vue`文件，而不是`index.js`文件。

至于什么时候将`index.vue`文件中的template模块、script模块、style模块编译成js代码，我们在 [通过debug搞清楚.vue文件怎么变成.js文件](https://mp.weixin.qq.com/s/0QfalimbwontX3UhSHMZng)文章中已经讲过了当import加载一个文件时会触发`@vitejs/plugin-vue`包中的`transform`钩子函数，在这个`transform`钩子函数中会将template模块、script模块、style模块编译成js代码。所以在浏览器中拿到的index.vue文件就是经过编译后的js代码了。

现在我们在浏览器的network中来看刚刚进入编译时`index.vue`文件代码，简化后的代码如下：
```
import {
  Fragment as _Fragment,
  createElementBlock as _createElementBlock,
  createElementVNode as _createElementVNode,
  createVNode as _createVNode,
  defineComponent as _defineComponent,
  openBlock as _openBlock,
  toDisplayString as _toDisplayString,
  ref,
} from "/node_modules/.vite/deps/vue.js?v=23bfe016";
import CommonChild from "/src/components/vModel/child.vue?t=1710943659056";
import "/src/components/vModel/index.vue?vue&type=style&index=0&scoped=0ebe7d62&lang.css";

const _sfc_main = _defineComponent({
  __name: "index",
  setup(__props, { expose: __expose }) {
    __expose();
    const inputValue = ref();
    const __returned__ = { inputValue, CommonChild };
    return __returned__;
  },
});

function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return (
    _openBlock(),
    _createElementBlock(
      _Fragment,
      null,
      [
        _createVNode(
          $setup["CommonChild"],
          {
            modelValue: $setup.inputValue,
            "onUpdate:modelValue":
              _cache[0] ||
              (_cache[0] = ($event) => ($setup.inputValue = $event)),
          },
          null,
          8,
          ["modelValue"]
        ),
        _createElementVNode(
          "p",
          null,
          "input value is: " + _toDisplayString($setup.inputValue),
          1
          /* TEXT */
        ),
      ],
      64
      /* STABLE_FRAGMENT */
    )
  );
}

_sfc_main.render = _sfc_render;
export default _sfc_main;
```
从上面的代码中我们可以看到编译后的js代码主要分为两块，第一块是`_sfc_main`组件对象，里面有name属性和setup方法。一个vue组件在运行时实际就是一个对象，这里的`_sfc_main`就是一个vue组件对象。至于`defineComponent`函数的作用是在定义 Vue 组件时提供类型推导的辅助函数，所以在我们这个场景没什么用。我们接着来看第二块`_sfc_render`，从名字我想你应该已经猜到了他是一个render函数。执行这个`_sfc_render`函数就会生成虚拟DOM，然后再由虚拟DOM生成浏览器上面的真实DOM。

我们再来看这个`render`函数，在这个`render`函数前面会调用`openBlock`函数和`createElementBlock`函数。他的作用是在编译时尽可能的提取多的关键信息，可以减少运行时比较新旧虚拟DOM带来的性能开销，我们这篇文章不关注这点，所以我们接下来会直接看下面的`_createVNode`函数和`_createElementVNode`函数。
# `v-model`语法糖怎么工作的
我们接着来看`render`函数中的`_createVNode`函数和`_createElementVNode`函数，代码如下：
```
import {
  createElementVNode as _createElementVNode,
  createVNode as _createVNode,
} from "/node_modules/.vite/deps/vue.js?v=23bfe016";

_createVNode(
  $setup["CommonChild"],
  {
    modelValue: $setup.inputValue,
    "onUpdate:modelValue":
      _cache[0] ||
      (_cache[0] = ($event) => ($setup.inputValue = $event)),
  },
  null,
  8,
  ["modelValue"]
),
_createElementVNode(
  "p",
  null,
  "input value is: " + _toDisplayString($setup.inputValue),
  1
  /* TEXT */
),
```
从这两个函数的名字我想你也能猜出来他们的作用是创建虚拟DOM，再仔细一看这两个函数不就是对应的我们template模块中的这两行代码吗。
```
<CommonChild v-model="inputValue" />
<p>input value is: {{ inputValue }}</p>
```
第一个`_createVNode`函数对应的是`CommonChild`，第二个`_createElementVNode`对应的是`p`标签。我们将重点放在`_createVNode`函数上，从import导入来看`_createVNode`函数是从vue中导出的`createVNode`函数。你是不是觉得`createVNode`这个名字比较熟悉呢，其实在 [vue官网](https://cn.vuejs.org/guide/extras/render-function.html#basic-usage)中有提到。
> `h()` 是 **hyperscript** 的简称——意思是“能生成 HTML (超文本标记语言) 的 JavaScript”。这个名字来源于许多虚拟 DOM 实现默认形成的约定。一个更准确的名称应该是 `createVnode()`，但当你需要多次使用渲染函数时，一个简短的名字会更省力。

vue官网中`h()` 函数用于生成虚拟DOM，其实`h()函数`底层就是调用的`createVnode`函数。同样的`createVnode`函数和`h()` 函数接收的参数也差不多，第一个参数可以是一个组件对象也可以是像`p`这样的html标签，也可以是一个虚拟DOM。第二个参数为给组件或者html标签传递的props属性或者attribute。第三个参数是该节点的children子节点。现在我们再来仔细看这个`_createVNode`函数你应该已经明白了：
```
_createVNode(
  $setup["CommonChild"],
  {
    modelValue: $setup.inputValue,
    "onUpdate:modelValue":
      _cache[0] ||
      (_cache[0] = ($event) => ($setup.inputValue = $event)),
  },
  null,
  8,
  ["modelValue"]
),
```
我们在 [Vue 3 的 setup语法糖到底是什么东西？](https://mp.weixin.qq.com/s/g_kkXZbKLCdlyP-oLaolcQ)文章中已经讲过了`render`函数中的`$setup`变量就是`setup`函数的返回值经过`Proxy`处理后的对象，由于`Proxy`的拦截处理让我们在template中使用ref变量时无需再写`.value`。在上面的`setup`函数中我们看到`CommonChild`组件对象也在返回值对象中，所以这里传入给`createVNode`函数的第一个参数为`CommonChild`组件对象。

我们再来看第二个参数对象，对象中有两个key，分别是`modelValue`和`onUpdate:modelValue`。这两个key就是传递给`CommonChild`组件的两个props，等等这里有两个问题。第一个问题是这里怎么是`onUpdate:modelValue`，我们知道的`v-model`是`:modelValue`和`@update:modelValue`的语法糖，不是说好的`@update`怎么变成了`onUpdate`了呢？第二个问题是`onUpdate:modelValue`明显是事件监听而不是props属性，怎么是“通过props属性”而不是“通过事件”传递给了`CommonChild`子组件呢？

因为在编译时处理v-on事件监听会将监听的事件首字母变成大写然后在前面加一个`on`，塞到props属性对象中，所以这里才是`onUpdate:modelValue`。所以在组件上不管是v-bind的attribute和prop，还是v-on事件监听，经过编译后都会被塞到一个大的props对象中。以`on`开头的属性我们都视作事件监听，用于和普通的attribute和prop区分。所以你在组件上绑定一个`onConfirm`属性，属性值为一个`handleClick`的函数。在子组件中使用`emit('confirm')`是可以触发`handleClick`函数的执行的，但是一般情况下还是不要这样写，维护代码的人会看着一脸蒙蔽的。

我们接着来看传递给`CommonChild`组件的这两个属性值。
```
{
  modelValue: $setup.inputValue,
  "onUpdate:modelValue":
    _cache[0] ||
    (_cache[0] = ($event) => ($setup.inputValue = $event)),
}
```
第一个`modelValue`的属性值是`$setup.inputValue`。前面我们已经讲过了`$setup.inputValue`就是指向`setup`中定义的名为`inputValue`的ref变量，所以第一个属性的作用就是给`CommonChild`组件添加`:modelValue="inputValue"`的属性。

我们再来看第二个属性`onUpdate:modelValue`，属性值为`_cache[0] ||(_cache[0] = ($event) => ($setup.inputValue = $event))`。这里为什么要加一个`_cache`缓存呢？原因是每次页面刷新都会重新触发`render`函数的执行，如果不加缓存那不就变成了每次执行`render`函数都会生成一个事件处理函数。这里的事件处理函数也很简单，接收一个`$event`变量然后赋值给`setup`中的`inputValue`变量。接收的`$event`变量就是我们在子组件中调用`emit`触发事件传过来的第二个变量，比如：`emit('update:modelValue', 'helllo word')`。为什么是第二个变量呢？是因为`emit`函数接收的第一个变量为要触发的事件名称。所以第二个属性的作用就是给`CommonChild`组件添加`@update:modelValue`的事件绑定。
# 编译时如何处理v-model
前面我们已经讲过了在运行时已经拿到了key为`modelValue`和`onUpdate:modelValue`的props属性对象了，我们知道这个`props`属性对象是在编译时由`v-model`指令编译而来的，那在这个编译过程中是如何处理`v-model`指令的呢？请看下面编译时的流程图：

![compile-progress](https://img2024.cnblogs.com/blog/1217259/202403/1217259-20240325103751043-1400335539.png)


首先会调用`parse`函数将template模块中的代码转换为AST抽象语法树，此时使用`v-model`的node节点的props属性中还是`v-model`。接着会调用`transform`函数，经过`transform`函数处理后在`node`节点中多了一个`codegenNode`属性。在`codegenNode`属性中我们看到没有`v-model`指令，取而代之的是`modelValue`和`onUpdate:modelValue`属性。经过`transform`函数处理后已经将`v-model`指令编译为`modelValue`和`onUpdate:modelValue`属性，此时还是AST抽象语法树。所以接下来就是调用`generate`函数将AST抽象语法树转换为`render`函数，到此为止编译时做的事情已经做完了。
## `parse`函数
首先是使用`parse`函数将template模块中的代码编译成AST抽象语法树，在这个过程中会使用到大量的正则表达式对字符串进行解析。我们直接来看编译后的AST抽象语法树是什么样子：
![parser](https://img2024.cnblogs.com/blog/1217259/202403/1217259-20240325103805986-1080924698.png)

从上图中我们可以看到使用`v-model`指令的node节点中有了`name`为`model`和`rawName`为`v-model`的props了，明显可以看出将template中code代码字符串转换为AST抽象语法树时没有处理`v-model`指令。那么什么时候处理的`v-model`指令呢？
## `transform`函数
其实是在后面的一个`transform`函数中处理的，在这个函数中主要调用的是`traverseNode`函数处理AST抽象语法树。在`traverseNode`函数中会去递归的去处理AST抽象语法树中的所有node节点，这也解释了为什么还要在`transform`函数中再抽取出来一个`traverseNode`函数。

我们再来思考一个问题，由于`traverseNode`函数会处理node节点的所有情况，比如`v-model`指令、`v-for`指令、`v-on`、`v-bind`。如果将这些的逻辑全部都放到`traverseNode`函数中，那`traverseNode`函数的体量将会是非常大的。所以抽取出来一个`nodeTransforms`的概念，这个`nodeTransforms`是一个数组。里面存了一组`transform`函数，用于处理node节点。每个`transform`函数都有自己独有的作用，比如`transformModel`函数用于处理`v-model`指令，`transformIf`函数用于处理`v-if`指令。我们来看看经过`transform`函数处理后的AST抽象语法树是什么样的：
![transform](https://img2024.cnblogs.com/blog/1217259/202403/1217259-20240325103821556-1180396139.png)


从上图中我们可以看到同一个使用`v-model`指令的node节点，经过`transform`函数处理后的和第一步经过`parse`函数处理后比起来node节点最外层多了一个`codegenNode`属性。

我们接下来看看`codegenNode`属性里面是什么样的：
![prop1](https://img2024.cnblogs.com/blog/1217259/202403/1217259-20240325103835880-108673540.png)

从上图中我们可以看到在`codegenNode`中还有一个`props`属性，在`props`属性下面还有一个`properties`属性。这个`properties`属性是一个数组，里面就是存的是node节点经过transform函数处理后的props属性的内容。我们看到`properties`数组中的每一个item都有`key`和`value`属性，我想你应该已经反应过来了，这个`key`和`value`分别对应的是props属性中的属性名和属性值。从上图中我们看到第一个属性的属性名`key`的值为`modelValue`，属性值`value`为`$setup.inputValue`。这个刚好就对应上`v-model`指令编译后的`:modelValue="$setup.inputValue"`。

我们再来接着看第二个属性：
![prop2](https://img2024.cnblogs.com/blog/1217259/202403/1217259-20240325103848397-1023590759.png)

从上图中我们同样也可以看到第二个属性的属性名`key`的值为`onUpdate:modelValue`，属性值`value`的值拼起来就是为一串箭头函数，和我们前面编译后的代码一模一样。第二个属性刚好就对应上`v-model`指令编译后的`@update:modelValue="($event) => ($setup.inputValue = $event)"`。

从上面的分析我们看到经过`transform`函数的处理后已经将`v-model`指令处理为对应的代码了，接下来我们要做的事情就是调用`generate`函数将AST抽象语法树转换成`render`函数
## `generate`函数
在`generate`函数中会递归遍历AST抽象语法树，然后生成对应的浏览器可执行的js代码。如下图：
![generate](https://img2024.cnblogs.com/blog/1217259/202403/1217259-20240325103904186-90772450.png)


从上图中我们可以看到经过`generate`函数处理后生成的`render`函数和我们之前在浏览器的network中看到的经过编译后的`index.vue`文件中的`render`函数一模一样。这也证明了`modelValue`属性和`@update:modelValue`事件塞到组件上是在编译时进行的。
# 总结
现在我们可以回答前面提的两个问题了：
- `v-model`指令是如何变成组件上的`modelValue`属性和`@update:modelValue`事件呢？

  首先会调用`parse`函数将template模块中的代码转换为AST抽象语法树，此时使用`v-model`的node节点的props属性中还是`v-model`。接着会调用`transform`函数，经过`transform`函数处理后在`node`节点中多了一个`codegenNode`属性。在`codegenNode`属性中我们看到没有`v-model`指令，取而代之的是`modelValue`和`onUpdate:modelValue`属性。经过`transform`函数处理后已经将`v-model`指令编译为`modelValue`和`onUpdate:modelValue`属性。其实在运行时`onUpdate:modelValue`属性就是等同于`@update:modelValue`事件。接着就是调用`generate`函数，将AST抽象语法树生成`render`函数。然后在浏览器中执行`render`函数时，将拿到的`modelValue`和`onUpdate:modelValue`属性塞到组件对象上，所以在组件上就多了两个`modelValue`属性和`@update:modelValue`事件。

- 将`v-model`指令转换为`modelValue`属性和`@update:modelValue`事件这一过程是在编译时还是运行时进行的呢？

  从上面的问题答案中我们可以知道将`v-model`指令转换为`modelValue`属性和`@update:modelValue`事件这一过程是在编译时进行的。

在`transform`函数中是调用`transformModel`函数处理`v-model`指令，这篇文章没有深入到`transformModel`函数源码内去讲解。如果大家对`transformModel`函数的源码感兴趣请在评论区留言或者给我发信息，我会在后面的文章安排上。

关注（图1）公众号：【前端欧阳】，解锁我更多vue原理文章。
加我（图2）微信回复「资料」，免费领取欧阳研究vue源码过程中收集的源码资料，欧阳写文章有时也会参考这些资料。同时让你的朋友圈多一位对vue有深入理解的人。
![公众号](https://img2024.cnblogs.com/blog/1217259/202404/1217259-20240427143439983-488694628.png)![微信](https://img2024.cnblogs.com/blog/1217259/202404/1217259-20240427143453708-1633619741.png)
