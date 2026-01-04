import { parse as parseSfc } from "@vue/compiler-sfc";
import MagicString from "magic-string";
import path from "node:path";
import {
  type CallExpression,
  type ObjectExpression,
  parse,
  type ParserOptions,
  type Program,
} from "oxc-parser";
import { camel, dash, pascal } from "radashi";
import type { Plugin } from "vite";

export type AutoComponentNameOptions = {
  include?: (string | RegExp)[];
  exclude?: (string | RegExp)[];
  nameCase?: "pascal" | "camel" | "kebab";
};

function getNameTransformer(
  nameCase: AutoComponentNameOptions["nameCase"],
): (input: string) => string {
  switch (nameCase) {
    case "camel":
      return camel;
    case "kebab":
      return dash;
    case "pascal":
    default:
      return pascal;
  }
}

function getComponentName(
  filePath: string,
  nameCase: AutoComponentNameOptions["nameCase"],
): string {
  const fileBase = path.basename(filePath, ".vue");
  const transform = getNameTransformer(nameCase);

  if (fileBase.toLowerCase() === "index") {
    const dir = path.basename(path.dirname(filePath));
    return transform(dir);
  }

  return transform(fileBase);
}

function matchesPattern(id: string, pattern: string | RegExp): boolean {
  if (typeof pattern === "string") return id.includes(pattern);
  return pattern.test(id);
}

function matchesAny(id: string, patterns: (string | RegExp)[]): boolean {
  return patterns.some((p) => matchesPattern(id, p));
}

async function parseProgram(
  scriptContent: string,
  lang: ParserOptions["lang"] = "js",
): Promise<Program | null> {
  const result = await parse(`virtual.${lang}`, scriptContent, {
    lang,
    sourceType: "module",
    range: true,
  });

  if (result.errors.length > 0) return null;

  return result.program;
}

function hasNameProperty(obj: ObjectExpression): boolean {
  const properties = obj.properties;
  return properties.some((p) => {
    if (p.type !== "Property") return false;

    const key = p.key;
    if (key.type === "Identifier") return key.name === "name";
    if (key.type === "Literal") return key.value === "name";

    return false;
  });
}

function findDefineOptions(program: Program): CallExpression | null {
  for (const stmt of program.body) {
    if (stmt.type !== "ExpressionStatement") continue;
    const expr = stmt.expression;
    if (expr.type !== "CallExpression") continue;
    const callee = expr.callee;
    if (callee.type !== "Identifier") continue;
    if (callee.name !== "defineOptions") continue;
    return expr;
  }
  return null;
}

async function injectDefineOptions(
  scriptContent: string,
  componentName: string,
  lang: ParserOptions["lang"],
): Promise<{ text: string; insertedAt: number } | null> {
  const program = await parseProgram(scriptContent, lang);
  if (!program) return null;

  const defineOptionsExpr = findDefineOptions(program);
  if (defineOptionsExpr) {
    if (defineOptionsExpr.arguments.length === 0) {
      const text = `{ name: "${componentName}" }`;
      return { text, insertedAt: defineOptionsExpr.end - 1 };
    } else {
      const arg = defineOptionsExpr.arguments[0];
      if (arg.type !== "ObjectExpression") return null;

      if (hasNameProperty(arg)) return null;

      const text = `name: "${componentName}",`;
      return { text, insertedAt: arg.start + 1 };
    }
  } else {
    const text = `\ndefineOptions({ name: "${componentName}" });\n`;
    return { text, insertedAt: 0 };
  }
}

function autoComponentName(options: AutoComponentNameOptions = {}): Plugin {
  const { include = [/\.vue$/i], exclude = [/\/node_modules\//i], nameCase = "pascal" } = options;

  return {
    name: "vite:vue-component-name",
    enforce: "pre",
    async transform(code, id) {
      if (!id.endsWith(".vue")) return null;

      if (matchesAny(id, exclude)) return null;

      if (!matchesAny(id, include)) return null;

      const componentName = getComponentName(id, nameCase);

      const { descriptor } = parseSfc(code, { filename: id });

      const ms = new MagicString(code);
      let changed = false;

      if (descriptor.scriptSetup) {
        const block = descriptor.scriptSetup;
        const result = await injectDefineOptions(
          block.content,
          componentName,
          block.lang as ParserOptions["lang"],
        );
        if (result) {
          const baseOffset = block.loc.start.offset;
          ms.appendLeft(baseOffset + result.insertedAt, result.text);
          changed = true;
        }
      }

      if (!changed) return null;

      return {
        code: ms.toString(),
        map: ms.generateMap({ hires: true, source: id }),
      };
    },
  };
}

export { autoComponentName };
export default autoComponentName;
