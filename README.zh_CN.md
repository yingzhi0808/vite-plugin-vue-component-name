[English](./README.md) | **简体中文**

## vite-plugin-vue-component-name

一个 Vite 插件：**自动为 Vue SFC 的 `<script setup>` 注入/补全 `defineOptions({ name })`**，组件名按文件路径生成，便于 Vue DevTools / 调试日志中识别组件。

### 背景

在 Vue 3.2.34 或以上版本中，使用 `<script setup>` 的单文件组件会自动根据文件名生成对应的 `name` 选项；但当文件路径形如 `button/index.vue` 时，自动生成的组件名会变成 `Index`（或 `index`）。

这会导致在递归组件和 `<KeepAlive>` 的 `include / exclude`（除了 Vue DevTools）等依赖组件名的场景下，仍然需要手动设置为 `Button`。本插件会自动识别 `button/index.vue` 和 `button.vue` 两种情况，自动设置组件名。

### 功能说明

- **仅处理 `.vue` 文件**（可通过 `include/exclude` 配置）
- **仅在存在 `<script setup>` 时生效**
- 生成组件名后，会在 `<script setup>` 内：
  - 若已存在 `defineOptions()` 且无参数：补成 `defineOptions({ name: "Xxx" })`
  - 若已存在 `defineOptions({ ... })` 且没有 `name`：在对象里注入 `name: "Xxx",`
  - 若不存在 `defineOptions(...)`：在 `<script setup>` 内容开头插入 `defineOptions({ name: "Xxx" });`
- 若已设置 `name`（不论在 `defineOptions` 对象中还是其它方式），插件不会覆盖

> 注意：`defineOptions` 需要 Vue 3.3+（`<script setup>` 宏）。

### 安装

```bash
pnpm add -D vite-plugin-vue-component-name
```

### 使用

在 `vite.config.ts` 中使用（建议放在 `@vitejs/plugin-vue` 之前）：

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueComponentName from "vite-plugin-vue-component-name";

export default defineConfig({
  plugins: [
    vueComponentName(),
    vue(),
  ],
});
```

### 配置项

```ts
export type AutoComponentNameOptions = {
  include?: (string | RegExp)[];
  exclude?: (string | RegExp)[];
  nameCase?: "pascal" | "camel" | "kebab";
};
```

- **include**：需要处理的文件匹配规则（默认 `[/\.vue$/i]`）
- **exclude**：需要排除的文件匹配规则（默认 `[/\/node_modules\//i]`）
- **nameCase**：组件名格式（默认 `"pascal"`）
  - `"pascal"`：`MyComponent`
  - `"camel"`：`myComponent`
  - `"kebab"`：`my-component`

### 组件名生成规则

给定文件路径 `.../FooBar.vue`：

- 取文件名（去掉 `.vue`）作为基础名：`FooBar`
- 再按 `nameCase` 转换后作为组件 `name`

`index.vue` 是特殊情况：

- `.../profile/index.vue` → 基础名取目录名 `profile` → 例如 pascal 后为 `Profile`
