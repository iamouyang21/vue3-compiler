# 前言
我们每天写`vue`代码时都在用`defineProps`，但是你有没有思考过下面这些问题。为什么`defineProps`不需要`import`导入？为什么不能在非`setup`顶层使用`defineProps`？`defineProps`是如何将声明的` props` 自动暴露给模板？
# 举几个例子
我们来看几个例子，分别对应上面的几个问题。

先来看一个正常的例子，`common-child.vue`文件代码如下：
```vue
<template>
  <div>content is {{ content }}</div>
</template>

<script setup lang="ts">
defineProps({
  content: String,
});
</script>
```
我们看到在这个正常的例子中没有从任何地方`import`导入`defineProps`，直接就可以使用了，并且在`template`中渲染了`props`中的`content`。

我们再来看一个在非`setup`顶层使用`defineProps`的例子，`if-child.vue`文件代码如下：
```vue
<template>
  <div>content is {{ content }}</div>
</template>

<script setup lang="ts">
import { ref } from "vue";
const count = ref(10);

if (count.value) {
  defineProps({
    content: String,
  });
}
</script>
```
代码跑起来直接就报错了，提示`defineProps is not defined`
# 通过debug搞清楚上面几个问题
在我的上一篇文章 [vue文件编译成js文件](/guide/vue-to-js) 中已经带你搞清楚了`vue`文件中的`<script>`模块是如何编译成浏览器可直接运行的`js`代码，其实底层就是依靠`vue/compiler-sfc`包的`compileScript`函数。

当我们`import`一个`vue`文件时会触发[@vitejs/plugin-vue](https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue)包的`transform`钩子函数，在这个函数中会调用一个`transformMain`函数。

`transformMain`函数中会调用`genScriptCode`、`genTemplateCode`、`genStyleCode`，分别对应的作用是将`vue`文件中的`<script>`模块编译为浏览器可直接运行的`js`代码、将`<template>`模块编译为`render`函数、将`<style>`模块编译为导入`css`文件的`import`语句。**`genScriptCode`函数底层调用的就是`vue/compiler-sfc`包的`compileScript`函数。**

一样的套路，首先我们在vscode的打开一个`debug`终端。
![debug-terminal](../images/common/debug-terminal.webp){data-zoomable}


然后在`node_modules`中找到`vue/compiler-sfc`包的`compileScript`函数打上断点，`compileScript`函数位置在`/node_modules/@vue/compiler-sfc/dist/compiler-sfc.cjs.js`。

在`debug`终端上面执行`yarn dev`后在浏览器中打开对应的页面，比如：[http://localhost:5173/](http://localhost:5173/) 。此时断点就会走到`compileScript`函数中，我们在`debug`中先来看看`compileScript`函数的第一个入参`sfc`。

## `compileScript`函数
我们再来回忆一下`common-child.vue`文件中的`script`模块代码如下：
```vue
<script setup lang="ts">
defineProps({
  content: String,
});
</script>
```
我们接着来看`compileScript`函数的入参`sfc`，在上一篇文章 [vue文件编译成js文件](/guide/vue-to-js) 中我们已经讲过了`sfc`是一个`descriptor`对象，`descriptor`对象是由`vue`文件编译来的。

`descriptor`对象拥有`template`属性、`scriptSetup`属性、`style`属性，分别对应`vue`文件的`<template>`模块、`<script setup>`模块、`<style>`模块。

在我们这个场景只关注`scriptSetup`属性，`sfc.scriptSetup.content`的值就是`<script setup>`模块中`code`代码字符串，`sfc.source`的值就是`vue`文件中的源代码code字符串。详情查看下图：

![common-child](../images/script/defineProps/common-child.webp){data-zoomable}


`compileScript`函数内包含了编译`script`模块的所有的逻辑，代码很复杂，光是源代码就接近1000行。这篇文章我们不会去通读`compileScript`函数的所有功能，只会讲处理`defineProps`相关的代码。下面这个是我简化后的代码：
```js
function compileScript(sfc, options) {
  const ctx = new ScriptCompileContext(sfc, options);
  const startOffset = ctx.startOffset;
  const endOffset = ctx.endOffset;
  const scriptSetupAst = ctx.scriptSetupAst;

  for (const node of scriptSetupAst.body) {
    if (node.type === "ExpressionStatement") {
      const expr = node.expression;
      if (processDefineProps(ctx, expr)) {
        ctx.s.remove(node.start + startOffset, node.end + startOffset);
      }
    }
    if (node.type === "VariableDeclaration" && !node.declare || node.type.endsWith("Statement")) {
      // ....
    }
  }

  ctx.s.remove(0, startOffset);
  ctx.s.remove(endOffset, source.length);

  let runtimeOptions = ``;
  const propsDecl = genRuntimeProps(ctx);
  if (propsDecl) runtimeOptions += `\n  props: ${propsDecl},`;

  const def =
    (defaultExport ? `\n  ...${normalScriptDefaultVar},` : ``) +
    (definedOptions ? `\n  ...${definedOptions},` : "");
  ctx.s.prependLeft(
    startOffset,
    `\n${genDefaultAs} /*#__PURE__*/${ctx.helper(
      `defineComponent`
    )}({${def}${runtimeOptions}\n  ${
      hasAwait ? `async ` : ``
    }setup(${args}) {\n${exposeCall}`
  );
  ctx.s.appendRight(endOffset, `})`);

  return {
    //....
    content: ctx.s.toString(),
  };
}
```
在`compileScript`函数中首先调用`ScriptCompileContext`类生成一个`ctx`上下文对象，然后遍历`vue`文件的`<script setup>`模块生成的`AST抽象语法树`。

如果节点类型为`ExpressionStatement`表达式语句，那么就执行`processDefineProps`函数，判断当前表达式语句是否是调用`defineProps`函数。如果是那么就删除掉`defineProps`调用代码，并且将调用`defineProps`函数时传入的参数对应的`node`节点信息存到`ctx`上下文中。

然后从参数`node`节点信息中拿到调用`defineProps`宏函数时传入的`props`参数的开始位置和结束位置。再使用`slice`方法并且传入开始位置和结束位置，从`<script setup>`模块的代码字符串中截取到`props`定义的字符串。然后将截取到的`props`定义的字符串拼接到`vue`组件对象的字符串中，最后再将编译后的`setup`函数代码字符串拼接到`vue`组件对象的字符串中。
## `ScriptCompileContext`类
`ScriptCompileContext`类中我们主要关注这几个属性：`startOffset`、`endOffset`、`scriptSetupAst`、`s`。先来看看他的`constructor`，下面是我简化后的代码。
```js
import MagicString from 'magic-string'

class ScriptCompileContext {
  source = this.descriptor.source
  s = new MagicString(this.source)
  startOffset = this.descriptor.scriptSetup?.loc.start.offset
  endOffset = this.descriptor.scriptSetup?.loc.end.offset

  constructor(descriptor, options) {
    this.s = new MagicString(this.source);
    this.scriptSetupAst = descriptor.scriptSetup && parse(descriptor.scriptSetup.content, this.startOffset);
  }
}
```
在前面我们已经讲过了`descriptor.scriptSetup`对象就是由`vue`文件中的`<script setup>`模块编译而来，`startOffset`和`endOffset`分别就是`descriptor.scriptSetup?.loc.start.offset`和`descriptor.scriptSetup?.loc.end.offset`，对应的是`<script setup>`模块在`vue`文件中的开始位置和结束位置。

`descriptor.source`的值就是`vue`文件中的源代码code字符串，这里以`descriptor.source`为参数`new`了一个`MagicString`对象。`magic-string`是由[svelte](https://github.com/sveltejs/svelte)的作者写的一个库，用于处理字符串的`JavaScript`库。

它可以让你在字符串中进行插入、删除、替换等操作，并且能够生成准确的`sourcemap`。`MagicString`对象中拥有`toString`、`remove`、`prependLeft`、`appendRight`等方法。`s.toString`用于生成返回的字符串，我们来举几个例子看看这几个方法你就明白了。

`s.remove( start, end )`用于删除从开始到结束的字符串：
```js
const s = new MagicString('hello word');
s.remove(0, 6);
s.toString(); // 'word'
```
`s.prependLeft( index, content )`用于在指定`index`的前面插入字符串：
```js
const s = new MagicString('hello word');
s.prependLeft(5, 'xx');
s.toString(); // 'helloxx word'
```
`s.appendRight( index, content )`用于在指定`index`的后面插入字符串：
```js
const s = new MagicString('hello word');
s.appendRight(5, 'xx');
s.toString(); // 'helloxx word'
```
我们接着看`constructor`中的`scriptSetupAst`属性是由一个`parse`函数的返回值赋值，`parse(descriptor.scriptSetup.content, this.startOffset)`，`parse`函数的代码如下：
```js
import { parse as babelParse } from '@babel/parser'

function parse(input: string, offset: number): Program {
  try {
    return babelParse(input, {
      plugins,
      sourceType: 'module',
    }).program
  } catch (e: any) {
  }
}
```
我们在前面已经讲过了`descriptor.scriptSetup.content`的值就是`vue`文件中的`<script setup>`模块的代码`code`字符串，`parse`函数中调用了`babel`提供的`parser`函数，将`vue`文件中的`<script setup>`模块的代码`code`字符串转换成`AST抽象语法树`。

![parser](../images/script/defineProps/parser.webp){data-zoomable}


现在我们再来看`compileScript`函数中的这几行代码你理解起来就没什么难度了，这里的`scriptSetupAst`变量就是由`vue`文件中的`<script setup>`模块的代码转换成的`AST抽象语法树`。
```js
const ctx = new ScriptCompileContext(sfc, options);
const startOffset = ctx.startOffset;
const endOffset = ctx.endOffset;
const scriptSetupAst = ctx.scriptSetupAst;
```
流程图如下：
![progress1](../images/script/defineProps/progress1.webp){data-zoomable}

## `processDefineProps`函数
我们接着将断点走到`for`循环开始处，代码如下：
```js
for (const node of scriptSetupAst.body) {
  if (node.type === "ExpressionStatement") {
    const expr = node.expression;
    if (processDefineProps(ctx, expr)) {
      ctx.s.remove(node.start + startOffset, node.end + startOffset);
    }
  }
}
```
遍历`AST抽象语法树`，如果当前节点类型为`ExpressionStatement`表达式语句，并且`processDefineProps`函数执行结果为`true`就调用`ctx.s.remove`方法。这会儿断点还在`for`循环开始处，在控制台执行`ctx.s.toString()`看看当前的`code`代码字符串。
![for-toString](../images/script/defineProps/for-toString.webp){data-zoomable}


从图上可以看见此时`toString`的执行结果还是和之前的`common-child.vue`源代码是一样的，并且很明显我们的`defineProps`是一个表达式语句，所以会执行`processDefineProps`函数。我们将断点走到调用`processDefineProps`的地方，看到简化过的`processDefineProps`函数代码如下：
```js
const DEFINE_PROPS = "defineProps";
function processDefineProps(ctx, node, declId) {
  if (!isCallOf(node, DEFINE_PROPS)) {
    return processWithDefaults(ctx, node, declId);
  }
  ctx.propsRuntimeDecl = node.arguments[0];
  return true;
}
```
在`processDefineProps`函数中首先执行了`isCallOf`函数，第一个参数传的是当前的`AST语法树`中的`node`节点，第二个参数传的是`"defineProps"`字符串。从`isCallOf`的名字中我们就可以猜出他的作用是判断当前的`node`节点的类型是不是在调用`defineProps`函数，`isCallOf`的代码如下：
```js
export function isCallOf(node, test) {
  return !!(
    node &&
    test &&
    node.type === "CallExpression" &&
    node.callee.type === "Identifier" &&
    (typeof test === "string"
      ? node.callee.name === test
      : test(node.callee.name))
  );
}
```
`isCallOf`函数接收两个参数，第一个参数`node`是当前的`node`节点，第二个参数`test`是要判断的函数名称，在我们这里是写死的`"defineProps"`字符串。我们在`debug console`中将`node.type`、`node.callee.type`、`node.callee.name`的值打印出来看看。
![isCallOf](../images/script/defineProps/isCallOf.webp){data-zoomable}


从图上看到`node.type`、`node.callee.type`、`node.callee.name`的值后，可以证明我们的猜测是正确的这里`isCallOf`的作用是判断当前的`node`节点的类型是不是在调用`defineProps`函数。

我们这里的`node`节点确实是在调用`defineProps`函数，所以`isCallOf`的执行结果为`true`，在`processDefineProps`函数中是对`isCallOf`函数的执行结果取反。也就是`!isCallOf(node, DEFINE_PROPS)`的执行结果为`false`，所以不会走到`return processWithDefaults(ctx, node, declId);`。

我们接着来看`processDefineProps`函数：
```js
function processDefineProps(ctx, node, declId) {
  if (!isCallOf(node, DEFINE_PROPS)) {
    return processWithDefaults(ctx, node, declId);
  }
  ctx.propsRuntimeDecl = node.arguments[0];
  return true;
}
```
如果当前节点确实是在执行`defineProps`函数，那么就会执行`ctx.propsRuntimeDecl = node.arguments[0];`。将当前`node`节点的第一个参数赋值给`ctx`上下文对象的`propsRuntimeDecl`属性，这里的第一个参数其实就是调用`defineProps`函数时给传入的第一个参数。

为什么写死成取`arguments[0]`呢？是因为`defineProps`函数只接收一个参数，传入的参数可以是一个对象或者数组。比如：
```js
const props = defineProps({
  foo: String
})

const props = defineProps(['foo', 'bar'])
```
**记住这个在`ctx`上下文上面塞的`propsRuntimeDecl`属性，后面生成运行时的`props`就是根据`propsRuntimeDecl`属性生成的。**

至此我们已经了解到了`processDefineProps`中主要做了两件事：判断当前执行的表达式语句是否是`defineProps`函数，如果是那么将解析出来的`props`属性的信息塞的`ctx`上下文的`propsRuntimeDecl`属性中。

我们这会儿来看`compileScript`函数中的`processDefineProps`代码你就能很容易理解了：
```js
for (const node of scriptSetupAst.body) {
  if (node.type === "ExpressionStatement") {
    const expr = node.expression;
    if (processDefineProps(ctx, expr)) {
      ctx.s.remove(node.start + startOffset, node.end + startOffset);
    }
  }
}
```
遍历`AST语法树`，如果当前节点类型是`ExpressionStatement`表达式语句，再执行`processDefineProps`判断当前`node`节点是否是执行的`defineProps`函数。

如果是`defineProps`函数就调用`ctx.s.remove`方法将调用`defineProps`函数的代码从源代码中删除掉。此时我们在`debug console`中执行`ctx.s.toString()`,看到我们的`code`代码字符串中已经没有了`defineProps`了：
![remove-toString](../images/script/defineProps/remove-toString.webp){data-zoomable}


现在我们能够回答第一个问题了：

**为什么`defineProps`不需要`import`导入？**

因为在编译过程中如果当前`AST抽象语法树`的节点类型是`ExpressionStatement`表达式语句，并且调用的函数是`defineProps`，那么就调用`remove`方法将调用`defineProps`函数的代码给移除掉。既然`defineProps`语句已经被移除了，自然也就不需要`import`导入了`defineProps`了。
![progress2](../images/script/defineProps/progress2.webp){data-zoomable}

## `genRuntimeProps`函数
接着在`compileScript`函数中执行了两条`remove`代码：
```js
ctx.s.remove(0, startOffset);
ctx.s.remove(endOffset, source.length);
```
这里的`startOffset`表示`script`标签中第一个代码开始的位置，  所以`ctx.s.remove(0, startOffset);`的意思是删除掉包含`<script setup>`开始标签前面的所有内容，也就是删除掉`template`模块的内容和`<script setup>`开始标签。这行代码执行完后我们再看看`ctx.s.toString()`的值：
![remove1](../images/script/defineProps/remove1.webp){data-zoomable}


接着执行`ctx.s.remove(endOffset, source.length);`，这行代码的意思是将`</script >`包含结束标签后面的内容全部删掉，也就是删除`</script >`结束标签和`<style>`模块。这行代码执行完后我们再来看看`ctx.s.toString()`的值：
![remove2](../images/script/defineProps/remove2.webp){data-zoomable}

由于我们的`common-child.vue`的`script`模块中只有一个`defineProps`函数，所以当移除掉`template`模块、`style`模块、`script`开始标签和结束标签后就变成了一个空字符串。如果你的`script`模块中还有其他`js`业务代码，当代码执行到这里后就不会是空字符串，而是那些`js`业务代码。

我们接着将`compileScript`函数中的断点走到调用`genRuntimeProps`函数处，代码如下：
```js
let runtimeOptions = ``;
const propsDecl = genRuntimeProps(ctx);
if (propsDecl) runtimeOptions += `\n  props: ${propsDecl},`;
```
从`genRuntimeProps`名字你应该已经猜到了他的作用，根据`ctx`上下文生成运行时的`props`。我们将断点走到`genRuntimeProps`函数内部，在我们这个场景中`genRuntimeProps`主要执行的代码如下：
```js
function genRuntimeProps(ctx) {
  let propsDecls;
  if (ctx.propsRuntimeDecl) {
    propsDecls = ctx.getString(ctx.propsRuntimeDecl).trim();
  }
  return propsDecls;
}
```
还记得这个`ctx.propsRuntimeDecl`是什么东西吗？我们在执行`processDefineProps`函数判断当前节点是否为执行`defineProps`函数的时候，就将调用`defineProps`函数的参数`node`节点赋值给`ctx.propsRuntimeDecl`。

换句话说`ctx.propsRuntimeDecl`中拥有调用`defineProps`函数传入的`props`参数中的节点信息。我们将断点走进`ctx.getString`函数看看是如何取出`props`的：
```js
getString(node, scriptSetup = true) {
  const block = scriptSetup ? this.descriptor.scriptSetup : this.descriptor.script;
  return block.content.slice(node.start, node.end);
}
```
我们前面已经讲过了`descriptor`对象是由`vue`文件编译而来，其中的`scriptSetup`属性就是对应的`<script setup>`模块。我们这里没有传入`scriptSetup`，所以`block`的值为`this.descriptor.scriptSetup`。同样我们前面也讲过`scriptSetup.content`的值是`<script setup>`模块`code`代码字符串。请看下图：
![block-content](../images/script/defineProps/block-content.webp){data-zoomable}


这里传入的`node`节点就是我们前面存在上下文中`ctx.propsRuntimeDecl`，也就是在调用`defineProps`函数时传入的参数节点，`node.start`就是参数节点开始的位置，`node.end`就是参数节点的结束位置。所以使用`content.slice`方法就可以截取出来调用`defineProps`函数时传入的`props`定义。请看下图：
![slice](../images/script/defineProps/slice.webp){data-zoomable}


现在我们再回过头来看`compileScript`函数中的调用`genRuntimeProps`函数的代码你就能很容易理解了：
```js
let runtimeOptions = ``;
const propsDecl = genRuntimeProps(ctx);
if (propsDecl) runtimeOptions += `\n  props: ${propsDecl},`;
```
这里的`propsDecl`在我们这个场景中就是使用`slice`截取出来的`props`定义，再使用`\n  props: ${propsDecl},`进行字符串拼接就得到了`runtimeOptions`的值。如图：
![runtimeOptions](../images/script/defineProps/runtimeOptions.webp){data-zoomable}


看到`runtimeOptions`的值是不是就觉得很熟悉了，又有`name`属性，又有`props`属性。其实就是`vue`组件对象的`code`字符串的一部分。`name`拼接逻辑是在省略的代码中，我们这篇文章只讲`props`相关的逻辑，所以`name`不在这篇文章的讨论范围内。

现在我们能够回答前面提的第三个问题了。

**`defineProps`是如何将声明的` props` 自动暴露给模板？**

编译时在移除掉`defineProps`相关代码时会将调用`defineProps`函数时传入的参数`node`节点信息存到`ctx`上下文中。遍历完`AST抽象语法树后`，然后从上下文中存的参数`node`节点信息中拿到调用`defineProps`宏函数时传入`props`的开始位置和结束位置。

再使用`slice`方法并且传入开始位置和结束位置，从`<script setup>`模块的代码字符串中截取到`props`定义的字符串。然后将截取到的`props`定义的字符串拼接到`vue`组件对象的字符串中，这样`vue`组件对象中就有了一个`props`属性，这个`props`属性在`template`模版中可以直接使用。

![progress3](../images/script/defineProps/progress3.webp){data-zoomable}

## 拼接成完整的浏览器运行时`js`代码
我们再来看`compileScript`函数中的最后一坨代码；
```js
const def =
  (defaultExport ? `\n  ...${normalScriptDefaultVar},` : ``) +
  (definedOptions ? `\n  ...${definedOptions},` : "");
ctx.s.prependLeft(
  startOffset,
  `\n${genDefaultAs} /*#__PURE__*/${ctx.helper(
    `defineComponent`
  )}({${def}${runtimeOptions}\n  ${
    hasAwait ? `async ` : ``
  }setup(${args}) {\n${exposeCall}`
);
ctx.s.appendRight(endOffset, `})`);

return {
  //....
  content: ctx.s.toString(),
};
```
这里先调用了`ctx.s.prependLeft`方法给字符串开始的地方插入了一串字符串，这串拼接的字符串看着脑瓜子痛，我们直接在`debug console`上面看看要拼接的字符串是什么样的：
![append](../images/script/defineProps/append.webp){data-zoomable}


看到这串你应该很熟悉，除了前面我们拼接的`name`和`props`之外还有部分`setup`编译后的代码，其实这就是`vue`组件对象的`code`代码字符串的一部分。

当断点执行完`prependLeft`方法后，我们在`debug console`中再看看此时的`ctx.s.toString()`的值是什么样的：
![last-toString](../images/script/defineProps/last-toString.webp){data-zoomable}

从图上可以看到`vue`组件对象上的`name`属性、`props`属性、`setup`函数基本已经拼接的差不多了，只差一个`})`结束符号，所以执行`ctx.s.appendRight(endOffset, `})`);`将结束符号插入进去。

我们最后再来看看`compileScript`函数的返回对象中的`content`属性，也就是`ctx.s.toString()`，`content`属性的值就是`vue`组件中的`<script setup>`模块编译成浏览器可执行的`js`代码字符串。
![full](../images/script/defineProps/full.webp){data-zoomable}

## 为什么不能在非`setup`顶层使用`defineProps`？
同样的套路我们来`debug`看看`if-child.vue`文件，先来回忆一下`if-child.vue`文件的代码。
```vue
<template>
  <div>content is {{ content }}</div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const count = ref(10);
if (count.value) {
  defineProps({
    content: String,
  });
}
</script>
```
将断点走到`compileScript`函数的遍历`AST抽象语法树`的地方，我们看到`scriptSetupAst.body`数组中有三个`node`节点。
![if-node-list](../images/script/defineProps/if-node-list.webp){data-zoomable}

从图中我们可以看到这三个`node`节点类型分别是：`ImportDeclaration`、`VariableDeclaration`、`IfStatement`。很明显这三个节点对应的是我们源代码中的`import`语句、`const`定义变量、`if `模块。我们再来回忆一下`compileScript`函数中的遍历`AST抽象语法树`的代码：
```js
function compileScript(sfc, options) {
   // 省略..
  for (const node of scriptSetupAst.body) {
    if (node.type === "ExpressionStatement") {
      const expr = node.expression;
      if (processDefineProps(ctx, expr)) {
        ctx.s.remove(node.start + startOffset, node.end + startOffset);
      }
    }

    if (
      (node.type === "VariableDeclaration" && !node.declare) ||
      node.type.endsWith("Statement")
    ) {
      // ....
    }
  }
  // 省略..
}
```
从代码我们就可以看出来第三个`node`节点，也就是在`if`中使用`defineProps`的代码，这个节点类型为`IfStatement`，不等于`ExpressionStatement`，所以代码不会走到`processDefineProps`函数中，也不会执行`remove`方法删除掉调用`defineProps`函数的代码。

当代码运行在浏览器时由于我们没有从任何地方`import`导入`defineProps`，当然就会报错`defineProps is not defined`。
# 总结
现在我们能够回答前面提的三个问题了。

- 为什么`defineProps`不需要`import`导入？

  因为在编译过程中如果当前`AST抽象语法树`的节点类型是`ExpressionStatement`表达式语句，并且调用的函数是`defineProps`，那么就调用`remove`方法将调用`defineProps`函数的代码给移除掉。既然`defineProps`语句已经被移除了，自然也就不需要`import`导入了`defineProps`了。

- 为什么不能在非`setup`顶层使用`defineProps`？

  因为在非`setup`顶层使用`defineProps`的代码生成`AST抽象语法树`后节点类型就不是`ExpressionStatement`表达式语句类型，只有`ExpressionStatement`表达式语句类型才会走到`processDefineProps`函数中，并且调用`remove`方法将调用`defineProps`函数的代码给移除掉。

  当代码运行在浏览器时由于我们没有从任何地方`import`导入`defineProps`，当然就会报错`defineProps is not defined`。

- `defineProps`是如何将声明的` props` 自动暴露给模板？

  编译时在移除掉`defineProps`相关代码时会将调用`defineProps`函数时传入的参数`node`节点信息存到`ctx`上下文中。遍历完`AST抽象语法树后`，然后从上下文中存的参数`node`节点信息中拿到调用`defineProps`宏函数时传入`props`的开始位置和结束位置。

  再使用`slice`方法并且传入开始位置和结束位置，从`<script setup>`模块的代码字符串中截取到`props`定义的字符串。然后将截取到的`props`定义的字符串拼接到`vue`组件对象的字符串中，这样`vue`组件对象中就有了一个`props`属性，这个`props`属性在`template`模版中可以直接使用。



[加入本书对应的「源码交流群」](/guide/contact)
