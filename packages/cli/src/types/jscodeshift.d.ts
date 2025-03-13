declare module "jscodeshift" {
  export interface Node {
    type: string;
    value?: string;
    loc?: {
      start: { line: number; column: number };
      end: { line: number; column: number };
    };
    source?: { value: string };
  }

  export interface JSXNode extends Node {
    type: "JSXText" | "JSXAttribute" | "JSXExpressionContainer";
    value: string;
  }

  export interface ImportNode extends Node {
    type: "ImportDeclaration";
    source: { value: string };
  }

  export interface Path<T extends Node = Node> {
    value: T;
    node: T;
    parent: Path<T>;
  }

  export interface JSCodeshift {
    (source: string): Collection;
    (paths: Path[]): Collection;
    JSXText: string;
    StringLiteral: string;
    ImportDeclaration: string;
    jsxExpressionContainer: (expression: Node) => Node;
    callExpression: (callee: Node, args: Node[]) => Node;
    identifier: (name: string) => Node;
    literal: (value: string) => Node;
    importDeclaration: (specifiers: Node[], source: Node) => Node;
    importSpecifier: (local: Node) => Node;
  }

  export interface API {
    jscodeshift: JSCodeshift;
  }

  export interface Collection<T extends Node = Node> {
    find(type: Type | string): Collection<T>;
    filter(fn: (path: Path<T>) => boolean): Collection<T>;
    forEach(fn: (path: Path<T>) => void): void;
    size(): number;
    paths(): Path<T>[];
    get(): { node: { program: { body: Node[] } } };
    replaceWith(node: Node): void;
    toSource(options?: Options): string;
    at(index: number): Collection<T>;
  }

  export interface FileInfo {
    path: string;
    source: string;
  }

  export interface Type {
    name: string;
  }

  export interface Options {
    quote?: "single" | "double";
  }

  export default function transform(
    file: FileInfo,
    api: API,
    options: Options,
  ): string;
}
