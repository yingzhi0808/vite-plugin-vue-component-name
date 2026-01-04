[中文](./README.zh_CN.md) | **English**

## vite-plugin-vue-define-options-name

A Vite plugin that **automatically injects/fills `defineOptions({ name })` in Vue SFC `<script setup>`**, generating component names from the file path so components are easier to identify in Vue DevTools and debugging logs.

### Background

In Vue 3.2.34 or later, SFCs using `<script setup>` can automatically derive the component `name` from the filename. However, for paths like `button/index.vue`, the generated component name becomes `Index` (or `index`).

This means that in scenarios that rely on component names—such as **recursive components** and `<KeepAlive>` **`include / exclude`** (in addition to Vue DevTools)—you may still need to manually set the name to `Button`. This plugin recognizes both `button/index.vue` and `button.vue` and sets a reasonable component name automatically.

### What it does

- Only processes `.vue` files (configurable via `include` / `exclude`)
- Only works when `<script setup>` exists
- After generating a component name, it updates `<script setup>` as follows:
  - If `defineOptions()` exists with no arguments: fills it to `defineOptions({ name: "Xxx" })`
  - If `defineOptions({ ... })` exists but has no `name`: injects `name: "Xxx",` into the object
  - If `defineOptions(...)` does not exist: inserts `defineOptions({ name: "Xxx" });` at the beginning of the `<script setup>` content
- If `name` is already present, it will not override it

> Note: `defineOptions` requires Vue 3.3+ (the `<script setup>` macro).

### Install

```bash
pnpm add -D vite-plugin-vue-define-options-name
```

### Usage

Use it in `vite.config.ts` (recommended to place it before `@vitejs/plugin-vue`):

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDefineOptionsName from "vite-plugin-vue-define-options-name";

export default defineConfig({
  plugins: [
    vueDefineOptionsName(),
    vue(),
  ],
});
```

### Options

```ts
export type AutoComponentNameOptions = {
  include?: (string | RegExp)[];
  exclude?: (string | RegExp)[];
  nameCase?: "pascal" | "camel" | "kebab";
};
```

- **include**: file match rules to include (default `[/\.vue$/i]`)
- **exclude**: file match rules to exclude (default `[/\/node_modules\//i]`)
- **nameCase**: output naming style (default `"pascal"`)
  - `"pascal"`: `MyComponent`
  - `"camel"`: `myComponent`
  - `"kebab"`: `my-component`

### Naming rules

Given a file path `.../FooBar.vue`:

- Uses the filename (without `.vue`) as the base name: `FooBar`
- Transforms it using `nameCase`, and uses it as the component `name`

Special case for `index.vue`:

- `.../profile/index.vue` → base name uses the directory name `profile` → e.g. `Profile` in pascal case
