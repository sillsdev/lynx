# Lynx

Lynx is a TypeScript library for adding diagnostic and formatting capabilities to translation editing environments. It provides a plugin-based architecture in which _providers_ check documents for issues, suggest fixes, and format text as users type. A _workspace_ orchestrates any number of providers and exposes a unified API to the host application.

## Packages

| Package                              | Description                                                     |
| ------------------------------------ | --------------------------------------------------------------- |
| `@sillsdev/lynx`                     | Core interfaces, `Workspace`, `DocumentManager`, `Localizer`    |
| `@sillsdev/lynx-usfm`                | USFM document support                                           |
| `@sillsdev/lynx-delta`               | [Quill Delta](https://quilljs.com/docs/delta/) document support |
| `@sillsdev/lynx-punctuation-checker` | Built-in punctuation, quotation, and character checker          |
| `@sillsdev/lynx-examples`            | Example providers and utilities                                 |

Install the packages you need:

```sh
npm install @sillsdev/lynx
npm install @sillsdev/lynx-usfm          # if using USFM documents
npm install @sillsdev/lynx-delta         # if using Quill Delta documents
npm install @sillsdev/lynx-punctuation-checker
```

## Core Concepts

### Documents

A `Document` is an in-memory representation of a text file, identified by a URI. For Scripture translation work, `ScriptureDocument` extends `Document` with a tree of typed nodes (books, chapters, verses, etc.) that providers can traverse.

The `DocumentFactory` interface is responsible for creating and updating document instances from raw content. Choose the factory that matches your document format:

- `UsfmDocumentFactory` — for USFM files
- `DeltaDocumentFactory` / `ScriptureDeltaDocumentFactory` — for Quill Delta documents

`EditFactory` is the companion interface providers use to produce text edits without being coupled to a specific document format. Its `createTextEdit(document, range, newText)` method returns the correct edit type for the document format in use. For Scripture documents, `ScriptureEditFactory` extends it with `createScriptureEdit(document, range, nodes)`, which constructs edits from Scripture node objects rather than raw strings. As with `DocumentFactory`, choose the implementation that matches your format:

- `UsfmEditFactory` — for USFM files
- `DeltaEditFactory` / `ScriptureDeltaEditFactory` — for Quill Delta documents

For a full walkthrough of implementing support for a new format, see [Implementing a New Document Format](docs/new-document-format.md).

### DocumentManager

`DocumentManager` tracks the lifecycle of open documents and makes them available to providers via the `DocumentAccessor` interface. Notify it whenever the host application opens, modifies, or closes a document:

```ts
documentManager.fireOpened(uri, { format: 'usfm', version: 1, content: text });
documentManager.fireChanged(uri, { contentChanges: [...], version: 2 });
documentManager.fireClosed(uri);
```

### DocumentReader

`DocumentReader` is the interface your application implements to connect `DocumentManager` to your document storage backend — whether that is the file system, a database, cloud storage, or any other source. Pass your implementation as the second argument to the `DocumentManager` constructor:

```ts
const documentManager = new DocumentManager(documentFactory, new MyDocumentReader());
```

The interface has two methods:

- `keys()` — return the URIs of all documents available in the backend
- `read(uri)` — return the raw content and metadata for a single document

`DocumentManager` uses `DocumentReader` to enumerate all documents when `all()` is called, and to load document content on demand when a document is requested but not yet in memory. If no `DocumentReader` is provided, `DocumentManager` only has access to documents that have been explicitly opened via `fireOpened`.

### DiagnosticProvider

A `DiagnosticProvider` inspects documents and reports problems as `Diagnostic` values. It can also return `DiagnosticAction` values — quick-fix suggestions that the UI can offer to the user.

### OnTypeFormattingProvider

An `OnTypeFormattingProvider` reacts to characters typed by the user and returns `TextEdit` values to apply immediately. Common uses include autocorrecting quotation marks or inserting matching punctuation pairs.

### Workspace

`Workspace` is the central orchestrator. It holds all registered providers, aggregates their diagnostics, manages dismissed diagnostics, and delegates formatting requests. Most host applications interact only with `Workspace`.

### Localizer

`Localizer` is a thin wrapper around [i18next](https://www.i18next.com/) that providers use to produce localized diagnostic messages. Each provider registers its own translation namespace during `init()`.

## Setting Up a Workspace

The following example sets up a workspace with English punctuation checking for USFM documents.

**1. Install dependencies**

```sh
npm install @sillsdev/lynx @sillsdev/lynx-usfm @sillsdev/lynx-punctuation-checker
```

**2. Create the workspace**

```ts
import { DocumentManager, Localizer, ScriptureDocument, Workspace } from '@sillsdev/lynx';
import { UsfmDocumentFactory, UsfmEditFactory } from '@sillsdev/lynx-usfm';
import { UsfmStylesheet } from '@sillsdev/machine/corpora';
import { StandardRuleSets } from '@sillsdev/lynx-punctuation-checker';

// Localization support
const localizer = new Localizer();

// USFM parsing
const stylesheet = new UsfmStylesheet('usfm.sty');
const documentFactory = new UsfmDocumentFactory(stylesheet);
const editFactory = new UsfmEditFactory(stylesheet);

// Document tracking
const documentManager = new DocumentManager<ScriptureDocument>(documentFactory);

// English punctuation rule set
const ruleSet = StandardRuleSets.English;

// Workspace with diagnostic and formatting providers
const workspace = new Workspace({
  localizer,
  diagnosticProviders: [...ruleSet.createDiagnosticProviders(localizer, documentManager, editFactory)],
  onTypeFormattingProviders: [...ruleSet.createOnTypeFormattingProviders(documentManager, editFactory)],
});

// Initialize before use
await workspace.init();
```

`StandardRuleSets.English` creates four diagnostic providers — `AllowedCharacterChecker`, `QuotationChecker`, `PairedPunctuationChecker`, and `PunctuationContextChecker` — plus an on-type formatting provider for autocorrecting quotation marks.

**3. Register additional providers**

Pass all providers to the workspace constructor. The following example adds the example `VerseOrderDiagnosticProvider`:

```ts
import { VerseOrderDiagnosticProvider, SimpleQuoteFormattingProvider } from '@sillsdev/lynx-examples';

const workspace = new Workspace({
  localizer,
  diagnosticProviders: [
    ...ruleSet.createDiagnosticProviders(localizer, documentManager, editFactory),
    new VerseOrderDiagnosticProvider(localizer, documentManager, editFactory),
  ],
  onTypeFormattingProviders: [
    ...ruleSet.createOnTypeFormattingProviders(documentManager, editFactory),
    new SimpleQuoteFormattingProvider(documentManager, editFactory),
  ],
});

await workspace.init();
```

## Managing Documents

Notify `DocumentManager` of document lifecycle events so providers always have up-to-date content:

```ts
// User opens a file
await documentManager.fireOpened(uri, {
  format: 'usfm',
  version: 1,
  content: rawText,
});

// User edits the file (incremental changes)
await documentManager.fireChanged(uri, {
  contentChanges: [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } }, text: 'Hello' }],
  version: 2,
});

// User closes the file
await documentManager.fireClosed(uri);
```

## Getting Diagnostics

Call `workspace.getDiagnostics(uri)` to get all current diagnostics for a document from all registered providers. Dismissed diagnostics are automatically excluded.

```ts
const diagnostics = await workspace.getDiagnostics('file:///path/to/document.usfm');

for (const diagnostic of diagnostics) {
  console.log(
    `[${diagnostic.source}] ${diagnostic.message}`,
    `at line ${diagnostic.range.start.line}, char ${diagnostic.range.start.character}`,
    `severity: ${diagnostic.severity}`, // 1=Error, 2=Warning, 3=Information, 4=Hint
  );
}
```

A `Diagnostic` has the following shape:

```ts
interface Diagnostic {
  code: string | number; // Provider-specific issue code
  source: string; // Provider id (e.g. 'quotation', 'verse-order')
  range: Range; // Location in the document
  severity: DiagnosticSeverity;
  message: string; // Human-readable description
  moreInfo?: string; // Extended explanation
  data?: unknown; // Provider-specific payload
  fingerprint?: string; // Stable identifier for dismissal
}
```

### Reactive Diagnostics

For push-based updates, subscribe to `workspace.diagnosticsChanged$`. It emits a combined `DiagnosticsChanged` event whenever any provider reports new results:

```ts
workspace.diagnosticsChanged$.subscribe(({ uri, version, diagnostics }) => {
  // Update the UI with the new diagnostics for `uri`
});
```

## Getting and Applying Fix Actions

Each diagnostic may have one or more `DiagnosticAction` values the user can invoke:

```ts
const actions = await workspace.getDiagnosticActions(uri, diagnostic);

for (const action of actions) {
  console.log(action.title, action.isPreferred ? '(preferred)' : '');

  if (action.edits != null) {
    // Apply the text edits directly to the document
    applyEdits(action.edits);
  }

  if (action.command != null) {
    // Execute the action via the workspace
    const changed = await workspace.executeDiagnosticActionCommand(action.command, uri, diagnostic);
    if (changed) {
      // The provider state changed; refresh diagnostics
    }
  }
}
```

## On-Type Formatting

Register the trigger characters with your editor, then call `workspace.getOnTypeEdits()` whenever the user types one of them:

```ts
// Get all characters that trigger formatting across all providers
const triggerChars = workspace.getOnTypeTriggerCharacters();

// When the user types a character
async function onCharacterTyped(uri: string, position: Position, ch: string) {
  if (triggerChars.includes(ch)) {
    const edits = await workspace.getOnTypeEdits(uri, position, ch);
    if (edits != null) {
      applyEdits(edits);
    }
  }
}
```

## Diagnostic Dismissal

Diagnostics that include a `fingerprint` can be permanently dismissed. Dismissed diagnostics are filtered out of future `getDiagnostics()` and `diagnosticsChanged$` results.

By default `Workspace` uses an in-memory store that does not persist across sessions. To persist dismissals, implement the `DiagnosticDismissalStore` interface. For a full walkthrough see [Implementing a Dismissal Store](docs/implementing-a-dismissal-store.md).

It can be provided in the `Workspace` constructor or assigned afterward:

```ts
// Option 1: pass in the constructor
const workspace = new Workspace({
  localizer,
  diagnosticProviders: [...],
  diagnosticDismissalStore: new MyDismissalStore(),
});

// Option 2: assign before or after calling workspace.init()
workspace.diagnosticDismissalStore = new MyDismissalStore();

// Dismiss a diagnostic (diagnostic.fingerprint must not be null)
await workspace.dismissDiagnostic(uri, diagnostic);
```

## Implementing a Custom Diagnostic Provider

To check for custom issues, implement the `DiagnosticProvider` interface. For a full walkthrough covering the interface contract, reactive diagnostics, `Diagnostic` and `DiagnosticAction` types, localization, commands, and the refresh cycle, see [Implementing a Custom Diagnostic Provider](docs/implementing-a-diagnostic-provider.md).
