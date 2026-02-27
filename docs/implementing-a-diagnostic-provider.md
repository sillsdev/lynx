# Implementing a Custom Diagnostic Provider

A `DiagnosticProvider` inspects documents and reports problems as `Diagnostic` values. It can also return `DiagnosticAction` values — quick-fix suggestions that the host UI can offer to the user.

## The `DiagnosticProvider<T>` Interface

```ts
import { DiagnosticProvider } from '@sillsdev/lynx';

class MyProvider implements DiagnosticProvider<TextEdit> { ... }
```

The type parameter `T` is the edit type produced by `getDiagnosticActions`. For most providers this is `TextEdit`. If your document format uses a different edit type (e.g. a Quill Delta op), use that type instead — it must match the `EditFactory` in use.

The interface has the following members:

| Member                                     | Description                                                                                                                                                                             |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                       | Unique string identifier for the provider. Used as the `source` field on every emitted `Diagnostic` and as the namespace for provider-specific commands.                                |
| `diagnosticsChanged$`                      | Observable that emits a `DiagnosticsChanged` event whenever this provider's results change for a document.                                                                              |
| `commands`                                 | Set of command strings this provider handles. Declare all commands here; `Workspace` will route `executeDiagnosticActionCommand` calls to `executeCommand` for any command in this set. |
| `init()`                                   | Called once by `Workspace.init()`. Register i18n namespaces and perform any async initialization here.                                                                                  |
| `getDiagnostics(uri)`                      | Return all current diagnostics for the document at `uri`. Called on demand by `Workspace.getDiagnostics()`.                                                                             |
| `getDiagnosticActions(uri, diagnostic)`    | Return fix actions for a single diagnostic.                                                                                                                                             |
| `executeCommand(command, uri, diagnostic)` | Execute a provider command. Return `true` if provider state changed; `Workspace` will call `refresh()` automatically.                                                                   |
| `refresh(uri)`                             | Called by `Workspace` after a dismissal or a command execution. Trigger re-validation of the document.                                                                                  |

---

## Setting Up `diagnosticsChanged$`

`diagnosticsChanged$` is the push channel `Workspace` subscribes to for reactive diagnostic updates. Lynx provides two helper functions to build it.

### `activeDiagnosticsChanged$`

Use this for providers that only need to validate currently-open documents:

```ts
import { activeDiagnosticsChanged$ } from '@sillsdev/lynx';
import { Subject } from 'rxjs';

private readonly refreshSubject = new Subject<string>();

constructor(private readonly documents: DocumentAccessor<MyDocument>) {
  this.diagnosticsChanged$ = activeDiagnosticsChanged$(
    documents,
    (doc) => this.validate(doc),
    this.refreshSubject,
  );
}
```

`activeDiagnosticsChanged$` subscribes to `documents.opened$`, `documents.changed$`, and `documents.closed$`. When a document closes it emits an empty diagnostics array for that URI. The optional `refreshSubject` parameter lets you trigger re-validation at any time by calling `refreshSubject.next(uri)`.

### `allDiagnosticsChanged$`

Use this when your provider needs to validate documents that are not currently open — for example, providers that perform cross-document consistency checks, or that load documents from a `DocumentReader`:

```ts
import { allDiagnosticsChanged$ } from '@sillsdev/lynx';

this.diagnosticsChanged$ = allDiagnosticsChanged$(documents, (doc) => this.validate(doc), this.refreshSubject);
```

`allDiagnosticsChanged$` additionally handles `documents.created$`, `documents.deleted$`, and `documents.reset$`. It also takes an initial snapshot of all documents when first subscribed, using a buffered connectable to avoid losing events that arrive during the snapshot pass.

**Rule of thumb:** use `activeDiagnosticsChanged$` unless you have a specific reason to run diagnostics on closed or unloaded documents.

---

## The `Diagnostic` Type

```ts
interface Diagnostic {
  code: string | number; // Provider-specific issue code
  source: string; // Must equal this.id
  range: Range; // Location in the document
  severity: DiagnosticSeverity;
  message: string; // Human-readable description
  moreInfo?: string; // Extended explanation or documentation link
  data?: unknown; // Arbitrary provider-specific payload
  fingerprint?: string; // Stable identifier for dismissal
}
```

### `DiagnosticSeverity`

| Value | Constant                         |
| ----- | -------------------------------- |
| `1`   | `DiagnosticSeverity.Error`       |
| `2`   | `DiagnosticSeverity.Warning`     |
| `3`   | `DiagnosticSeverity.Information` |
| `4`   | `DiagnosticSeverity.Hint`        |

### `source`

The `source` field on every diagnostic **must** equal `this.id`. `Workspace` uses this to route dismissals and command executions back to the correct provider.

### `data`

Use `data` to carry provider-specific information that `getDiagnosticActions` will need when constructing fix actions. For example, a missing-verse provider might store the verse reference in `data` so that `getDiagnosticActions` can build an insertion edit without re-parsing the document.

### `fingerprint`

Set `fingerprint` on any diagnostic that should be dismissible. A fingerprint is a stable string that uniquely identifies a particular issue within a document — it should not change when unrelated lines are edited.

A good fingerprint combines the issue code and enough context to identify the specific occurrence:

```ts
// e.g. "2|GEN 1:3" — code 2, missing verse GEN 1:3
fingerprint: `${code}|${verseRef}`,
```

Fingerprints are stored by `DiagnosticDismissalStore` and matched against future diagnostics from the same provider and document. Diagnostics without a fingerprint cannot be dismissed.

---

## The `DiagnosticAction<T>` Type

```ts
interface DiagnosticAction<T> {
  title: string; // Display text shown in the UI
  diagnostic: Diagnostic;
  isPreferred?: boolean; // Hint to the UI to highlight this action
  edits?: T[]; // Text edits to apply directly
  command?: string; // Provider command to execute instead
}
```

An action may carry either `edits` or `command` — not both.

### Edit-based actions

Return `edits` when the fix can be expressed entirely as text replacements. The host application applies them directly without calling back into the workspace:

```ts
{
  title: 'Insert missing verse',
  isPreferred: true,
  diagnostic,
  edits: editFactory.createTextEdit(document, insertionRange, verseText),
}
```

For Scripture document formats, use `ScriptureEditFactory.createScriptureEdit` to build edits from Scripture node objects:

```ts
{
  title: 'Insert missing verse',
  isPreferred: true,
  diagnostic,
  edits: scriptureEditFactory.createScriptureEdit(document, insertionRange, verseNode),
}
```

### Command-based actions

Return a `command` string when the action needs to modify provider state rather than (or in addition to) the document. The host calls `workspace.executeDiagnosticActionCommand(action.command, uri, diagnostic)`, which routes to `executeCommand` on the owning provider:

```ts
{
  title: 'Exclude this verse from checking',
  diagnostic,
  command: 'excludeVerse',
}
```

The command string must appear in `this.commands`. `Workspace` ignores commands not declared there.

---

## `executeCommand` and the Refresh Cycle

`executeCommand` receives the command name, the URI of the document it was invoked on, and the original `Diagnostic`:

```ts
executeCommand(command: string, uri: string, diagnostic: Diagnostic): Promise<boolean> {
  if (command === 'excludeVerse') {
    this.excludedVerses.add(diagnostic.data as string);
    return Promise.resolve(true);  // state changed
  }
  return Promise.resolve(false);
}
```

Return `true` if provider state changed in a way that would affect diagnostics. `Workspace` will then call `refresh(uri)` automatically. Return `false` if no re-evaluation is needed.

`refresh` should push the URI through the `refreshSubject` so that `diagnosticsChanged$` re-validates the document:

```ts
refresh(uri: string): Promise<void> {
  this.refreshSubject.next(uri);
  return Promise.resolve();
}
```

---

## Localization

Providers use `Localizer` (a thin wrapper around [i18next](https://www.i18next.com/)) for human-readable diagnostic messages. Register your translation namespace in `init()`:

```ts
init(): Promise<void> {
  this.localizer.addNamespace(
    'myProvider',
    (language) => import(`./locales/${language}/my-provider.json`, { with: { type: 'json' } }),
  );
  return Promise.resolve();
}
```

Then use `this.localizer.t('myProvider:someKey')` when building `message` strings inside `validate()`. Translations are loaded lazily when the active language is first requested.

---

## Full Example

The following is a complete, annotated provider skeleton. It validates plain text documents and reports issues with two codes.

```ts
import {
  activeDiagnosticsChanged$,
  Diagnostic,
  DiagnosticAction,
  DiagnosticProvider,
  DiagnosticsChanged,
  DiagnosticSeverity,
  DocumentAccessor,
  Localizer,
  TextDocument,
  TextEdit,
} from '@sillsdev/lynx';
import { Observable, Subject } from 'rxjs';

export class MyDiagnosticProvider implements DiagnosticProvider<TextEdit> {
  // Unique identifier — used as the `source` field on every diagnostic
  // and as the routing key for commands declared below.
  public readonly id = 'my-provider';

  // All command strings this provider handles. Workspace routes
  // executeDiagnosticActionCommand() calls here for any string in this set.
  public readonly commands = new Set<string>(['ignoreIssue']);

  // Push channel for reactive diagnostics. activeDiagnosticsChanged$
  // re-validates each time a document opens, changes, or closes,
  // and whenever refreshSubject emits a URI.
  public readonly diagnosticsChanged$: Observable<DiagnosticsChanged>;

  private readonly refreshSubject = new Subject<string>();

  // Track which issues the user has chosen to ignore
  private readonly ignoredIssues = new Set<string>();

  constructor(
    private readonly localizer: Localizer,
    private readonly documents: DocumentAccessor<TextDocument>,
    private readonly editFactory: EditFactory<TextDocument, TextEdit>,
  ) {
    this.diagnosticsChanged$ = activeDiagnosticsChanged$(
      documents,
      (doc) => Promise.resolve(this.validate(doc)),
      this.refreshSubject,
    );
  }

  // Called once by Workspace.init(). Register i18n namespaces here.
  init(): Promise<void> {
    this.localizer.addNamespace(
      'myProvider',
      (language) => import(`./locales/${language}/my-provider.json`, { with: { type: 'json' } }),
    );
    return Promise.resolve();
  }

  // Return all current diagnostics for the document at `uri`.
  async getDiagnostics(uri: string): Promise<Diagnostic[]> {
    const doc = await this.documents.get(uri);
    if (doc == null) return [];
    return this.validate(doc);
  }

  // Return fix actions for a single diagnostic.
  async getDiagnosticActions(uri: string, diagnostic: Diagnostic): Promise<DiagnosticAction<TextEdit>[]> {
    const doc = await this.documents.get(uri);
    if (doc == null) return [];

    if (diagnostic.code === 1) {
      // Provide a direct text edit fix
      return [
        {
          title: this.localizer.t('myProvider:fixIssue'),
          isPreferred: true,
          diagnostic,
          edits: this.editFactory.createTextEdit(doc, diagnostic.range, correctedText),
        },
        {
          title: this.localizer.t('myProvider:ignoreIssue'),
          diagnostic,
          command: 'ignoreIssue',
        },
      ];
    }
    return [];
  }

  // Execute a command registered in `this.commands`.
  // Return true if provider state changed; Workspace will call refresh().
  executeCommand(command: string, _uri: string, diagnostic: Diagnostic): Promise<boolean> {
    if (command === 'ignoreIssue' && diagnostic.fingerprint != null) {
      this.ignoredIssues.add(diagnostic.fingerprint);
      return Promise.resolve(true); // state changed — triggers refresh
    }
    return Promise.resolve(false);
  }

  // Called by Workspace after a dismissal or command execution.
  // Push the URI through refreshSubject to trigger re-validation.
  refresh(uri: string): Promise<void> {
    this.refreshSubject.next(uri);
    return Promise.resolve();
  }

  private validate(doc: TextDocument): Diagnostic[] {
    const text = doc.getText();
    const diagnostics: Diagnostic[] = [];

    // ... scan text and build Diagnostic objects ...

    return diagnostics.filter((d) => d.fingerprint == null || !this.ignoredIssues.has(d.fingerprint));
  }
}
```

---

## Important Rules

- The `source` field on every emitted `Diagnostic` must equal `this.id`.
- Every command string returned in a `DiagnosticAction.command` must appear in `this.commands`.
- Set `fingerprint` on diagnostics that should be dismissible. A fingerprint must be stable across edits to unrelated parts of the document.
- Return `true` from `executeCommand` when provider state changed. `Workspace` handles calling `refresh()`.
- Call `this.refreshSubject.next(uri)` inside `refresh()` to re-evaluate the document via `diagnosticsChanged$`.
- Do not push to `refreshSubject` from within `getDiagnostics` — that method is a pull channel and must not trigger side effects.
