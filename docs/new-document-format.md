# Implementing a New Document Format

A document format implementation gives Lynx providers access to documents in your application. There are three paths depending on how content is stored and whether your format has semantic Scripture structure:

- **Plain text format** — for string-based formats with no chapter/verse/paragraph structure. Providers receive the document as plain text.
- **Scripture format** — for string-based formats that map to a Scripture node tree (books, chapters, verses, paragraphs, etc.). Providers can traverse and manipulate the structure directly.
- **Custom format** — for formats whose content is not a plain string (e.g. a parsed object model or binary representation). Implement the `Document` interface directly and define custom content and change types.

All three paths require three classes: a **Document**, a **DocumentFactory**, and an **EditFactory**. Scripture formats additionally require a parser and a serializer, which are covered alongside the DocumentFactory and EditFactory classes respectively.

## Plain Text Format

### Document class

Extend `TextDocument` from `@sillsdev/lynx`. `TextDocument` handles line/offset tracking and incremental text updates, so very little additional code is needed.

```ts
import { TextDocument } from '@sillsdev/lynx';

export class MyDocument extends TextDocument {
  // TextDocument already implements getText(), positionAt(), and update().
  // Add any format-specific accessors here if needed.
}
```

### DocumentFactory class

Implement `DocumentFactory<MyDocument>`. The factory is responsible for constructing new document instances and applying incremental changes.

```ts
import { DocumentChanges, DocumentData, DocumentFactory, TextDocumentChange } from '@sillsdev/lynx';
import { MyDocument } from './my-document';

export class MyDocumentFactory implements DocumentFactory<MyDocument> {
  create(uri: string, data: DocumentData): MyDocument {
    return new MyDocument(uri, data.format, data.version, data.content);
  }

  update(document: MyDocument, changes: DocumentChanges<TextDocumentChange>): MyDocument {
    document.update(changes.contentChanges, changes.version);
    return document;
  }
}
```

`DocumentData` carries the raw `content` string, `format` identifier, and `version` number. `DocumentChanges` carries an array of range-based text replacements and the new `version`.

### EditFactory class

Extend `TextEditFactory<MyDocument>`. The base class already implements `createTextEdit()` by returning a plain `TextEdit`, so no additional code is required for a text-only format.

```ts
import { TextEditFactory } from '@sillsdev/lynx';
import { MyDocument } from './my-document';

export class MyEditFactory extends TextEditFactory<MyDocument> {}
```

### Putting it together

```ts
import { DocumentManager } from '@sillsdev/lynx';
import { MyDocumentFactory } from './my-document-factory';
import { MyEditFactory } from './my-edit-factory';

const documentFactory = new MyDocumentFactory();
const editFactory = new MyEditFactory();
const documentManager = new DocumentManager(documentFactory);
```

Pass `documentManager` and `editFactory` to any provider constructors that require them.

---

## Scripture Format

A Scripture format implementation exposes the document as a tree of typed nodes — `ScriptureBook`, `ScriptureParagraph`, `ScriptureChapter`, `ScriptureVerse`, `ScriptureText`, and others — that providers traverse and query. This requires two additional responsibilities beyond the plain text path: a **parser** that builds the node tree from raw content, and a **serializer** that converts nodes back to raw format text.

### Document class

Extend `ScriptureTextDocument`, which combines `TextDocument` with the `ScriptureDocument` node tree interface via `ScriptureDocumentMixin`.

The constructor must parse the raw content into a Scripture node tree and append the top-level nodes as children of the document. Every node must have an accurate `range` value so that providers can locate issues in the source text.

Override `update()` to re-parse the affected region after incremental changes.

```ts
import { ScriptureNode, ScriptureTextDocument, TextDocumentChange } from '@sillsdev/lynx';

export class MyScriptureDocument extends ScriptureTextDocument {
  constructor(uri: string, format: string, version: number, content: string) {
    super(uri, format, version, content);
    for (const node of parseMyFormat(content)) {
      this.appendChild(node);
    }
  }

  update(changes: TextDocumentChange[], version: number): void {
    super.update(changes, version);
    this.clearChildren();
    for (const node of parseMyFormat(this.getText())) {
      this.appendChild(node);
    }
  }
}
```

If parsing is expensive, consider re-parsing only the lines affected by each change rather than the full document on every update.

If your content is not a plain string, `ScriptureTextDocument` is not appropriate. Instead, apply `ScriptureDocumentMixin` directly to your own Document base class. `ScriptureTextDocument` itself is just `ScriptureDocumentMixin(TextDocument)`, so the mixin works with any class that implements `Document`:

```ts
import { ScriptureDocumentMixin } from '@sillsdev/lynx';
import { MyDocument } from './my-document';

export class MyScriptureDocument extends ScriptureDocumentMixin(MyDocument) {
  constructor(uri: string, format: string, version: number, content: MyContent) {
    super(uri, format, version, content);
    for (const node of parseMyFormat(content)) {
      this.appendChild(node);
    }
  }

  update(changes: MyChange[], version: number): void {
    super.update(changes, version);
    this.clearChildren();
    for (const node of parseMyFormat(this.getContent())) {
      this.appendChild(node);
    }
  }
}
```

### DocumentFactory class

The shape is identical to the plain text case. The factory's `create()` method constructs a new document, which in its constructor calls the parser to build the initial Scripture node tree.

```ts
import { DocumentChanges, DocumentData, DocumentFactory, TextDocumentChange } from '@sillsdev/lynx';
import { MyScriptureDocument } from './my-scripture-document';

export class MyDocumentFactory implements DocumentFactory<MyScriptureDocument> {
  create(uri: string, data: DocumentData): MyScriptureDocument {
    return new MyScriptureDocument(uri, data.format, data.version, data.content);
  }

  update(document: MyScriptureDocument, changes: DocumentChanges<TextDocumentChange>): MyScriptureDocument {
    document.update(changes.contentChanges, changes.version);
    return document;
  }
}
```

The parser itself typically lives as a private helper of the document class. Key requirements:

- Return instances of the core node types: `ScriptureBook`, `ScriptureParagraph`, `ScriptureChapter`, `ScriptureVerse`, `ScriptureCharacterStyle`, `ScriptureNote`, `ScriptureText`, etc.
- Set the `range` property on every node. Ranges must use line/character positions consistent with the values `positionAt()` would return for those offsets.
- Build the parent/child hierarchy by constructing container nodes first, then appending leaf and child nodes to them.

```ts
import {
  ScriptureBook,
  ScriptureChapter,
  ScriptureNode,
  ScriptureParagraph,
  ScriptureText,
  ScriptureVerse,
} from '@sillsdev/lynx';

function parseMyFormat(content: string): ScriptureNode[] {
  const nodes: ScriptureNode[] = [];
  // ... walk the content and build nodes ...
  return nodes;
}
```

### EditFactory class

Extend `ScriptureTextEditFactory<MyScriptureDocument>`, which inherits `createTextEdit()` from `TextEditFactory` and adds the abstract `createScriptureEdit()` method. Implement `createScriptureEdit()` by delegating to a serializer that converts the given nodes back to raw format text.

```ts
import { Range, ScriptureDocument, ScriptureNode, ScriptureTextEditFactory, TextEdit } from '@sillsdev/lynx';
import { MyScriptureDocument } from './my-scripture-document';

export class MyEditFactory extends ScriptureTextEditFactory<MyScriptureDocument> {
  createScriptureEdit(document: ScriptureDocument, range: Range, nodes: ScriptureNode[] | ScriptureNode): TextEdit[] {
    const nodeArray = Array.isArray(nodes) ? nodes : [nodes];
    return [{ range, newText: serializeMyFormat(nodeArray) }];
  }
}
```

The serializer typically lives as a private helper of the edit factory:

```ts
function serializeMyFormat(nodes: ScriptureNode[]): string {
  return nodes.map(serializeNode).join('');
}

function serializeNode(node: ScriptureNode): string {
  // ... format-specific serialization per node type ...
}
```

---

## Custom Format

Use this path when your content is not a plain string — for example, a pre-parsed object model, a binary format, or a structured representation like Quill Delta. You implement the `Document` interface directly and use the generic type parameters on `DocumentFactory` and `EditFactory` to carry your custom content and change types through to providers.

### Document class

Implement the `Document` interface from `@sillsdev/lynx`:

```ts
import { Document, Position } from '@sillsdev/lynx';

export class MyDocument implements Document {
  readonly uri: string;
  readonly format: string;
  version: number;

  private content: MyContent;

  constructor(uri: string, format: string, version: number, content: MyContent) {
    this.uri = uri;
    this.format = format;
    this.version = version;
    this.content = content;
  }

  getText(): string {
    // Return a plain text representation of the document.
    // Providers use this for text-based diagnostics and range calculations.
    return convertToPlainText(this.content);
  }

  positionAt(offset: number): Position {
    // Convert a character offset in getText() to a line/character Position.
    const text = this.getText();
    let line = 0;
    let character = 0;
    for (let i = 0; i < offset && i < text.length; i++) {
      if (text[i] === '\n') {
        line++;
        character = 0;
      } else {
        character++;
      }
    }
    return { line, character };
  }

  update(changes: MyChange[], version: number): void {
    // Apply each change to this.content in order, then update the version.
    for (const change of changes) {
      this.content = applyChange(this.content, change);
    }
    this.version = version;
  }
}
```

### DocumentFactory class

`DocumentFactory` has three generic parameters: `DocumentFactory<TDoc, TChange, TContent>`. Use them to specify your document class, your change type, and your content type. This allows `DocumentManager.fireOpened` and `fireChanged` to accept your custom types.

```ts
import { DocumentChanges, DocumentData, DocumentFactory } from '@sillsdev/lynx';
import { MyDocument } from './my-document';

export class MyDocumentFactory implements DocumentFactory<MyDocument, MyChange, MyContent> {
  create(uri: string, data: DocumentData<MyContent>): MyDocument {
    return new MyDocument(uri, data.format, data.version, data.content);
  }

  update(document: MyDocument, changes: DocumentChanges<MyChange>): MyDocument {
    document.update(changes.contentChanges, changes.version);
    return document;
  }
}
```

### EditFactory class

`EditFactory` has two generic parameters: `EditFactory<TDoc, TEdit>`. If your format uses a custom edit type instead of `TextEdit`, specify it here.

```ts
import { EditFactory, Range } from '@sillsdev/lynx';
import { MyDocument } from './my-document';

export class MyEditFactory implements EditFactory<MyDocument, MyEdit> {
  createTextEdit(document: MyDocument, range: Range, newText: string): MyEdit[] {
    // Construct and return the format-specific edit operation.
    return [buildEdit(document, range, newText)];
  }
}
```

---

## Packaging

Package your format implementation as a standalone npm package. Follow the `@sillsdev/lynx-<format>` naming convention used by the built-in packages.

The file layout below assumes the package lives inside the Lynx monorepo under `packages/`. If your package is in a separate repository, any standard npm package layout works.

Recommended file layout:

```
packages/
  my-format/
    src/
      my-document.ts
      my-document-factory.ts
      my-edit-factory.ts
      index.ts
    package.json
    tsconfig.json
```

`index.ts` should export exactly the document class, document factory, and edit factory:

```ts
export { MyDocument } from './my-document';
export { MyDocumentFactory } from './my-document-factory';
export { MyEditFactory } from './my-edit-factory';
```
