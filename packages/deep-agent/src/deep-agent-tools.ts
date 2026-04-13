import { DiagnosticProvider, Document, DocumentAccessor } from '@sillsdev/lynx';
import { StructuredTool, tool } from 'langchain';
import { z } from 'zod';

const diagnosticSchema = z.object({
  code: z.union([z.string(), z.number()]),
  source: z.string(),
  range: z.object({
    start: z.object({ line: z.number(), character: z.number() }),
    end: z.object({ line: z.number(), character: z.number() }),
  }),
  severity: z.number(),
  message: z.string(),
  moreInfo: z.string().optional(),
  data: z.unknown().optional(),
  fingerprint: z.string().optional(),
});

export function createDiagnosticProviderTools(providers: DiagnosticProvider<unknown>[]): StructuredTool[] {
  function findProvider(source: string): DiagnosticProvider<unknown> | undefined {
    return providers.find((p) => p.id === source);
  }

  return [
    tool(
      () => {
        return Promise.resolve(
          JSON.stringify(
            providers.map((p) => ({ id: p.id, description: p.description, commands: Array.from(p.commands) })),
          ),
        );
      },
      {
        name: 'get_diagnostic_providers',
        description: 'Returns the list of available diagnostic providers with their IDs and supported commands.',
        schema: z.object({}),
      },
    ),
    tool(
      async ({ uri }) => {
        const results = await Promise.all(providers.map((p) => p.getDiagnostics(uri)));
        return JSON.stringify(results.flat());
      },
      {
        name: 'get_diagnostics',
        description: 'Get all diagnostics (errors, warnings, and other issues) for a document by its URI',
        schema: z.object({
          uri: z.string().describe('The document URI to get diagnostics for'),
        }),
      },
    ),
    tool(
      async ({ providerId, uri }: { providerId: string; uri: string }) => {
        const provider = findProvider(providerId);
        if (provider == null) return JSON.stringify({ error: `Unknown provider: ${providerId}` });
        const diagnostics = await provider.getDiagnostics(uri);
        return JSON.stringify(diagnostics);
      },
      {
        name: 'get_diagnostics_by_provider',
        description: 'Get diagnostics for a specific provider by its ID.',
        schema: z.object({
          providerId: z.string().describe('The provider ID to get diagnostics from'),
          uri: z.string().describe('The document URI to get diagnostics for'),
        }),
      },
    ),
    tool(
      async ({ uri, diagnostic }) => {
        const provider = findProvider(diagnostic.source);
        if (provider == null) return JSON.stringify([]);
        const actions = await provider.getDiagnosticActions(uri, diagnostic);
        return JSON.stringify(actions);
      },
      {
        name: 'get_diagnostic_actions',
        description: 'Get available fix actions for a specific diagnostic issue in a document.',
        schema: z.object({
          uri: z.string().describe('The document URI'),
          diagnostic: diagnosticSchema.describe('The diagnostic to get actions for'),
        }),
      },
    ),
    tool(
      async ({ command, uri, diagnostic }) => {
        const provider = findProvider(diagnostic.source);
        if (provider == null) return JSON.stringify({ executed: false });
        const result = await provider.executeCommand(command, uri, diagnostic);
        if (result) await provider.refresh(uri);
        return JSON.stringify({ executed: result });
      },
      {
        name: 'execute_diagnostic_command',
        description: 'Execute a diagnostic action command to apply a fix to a document',
        schema: z.object({
          command: z.string().describe('The command to execute'),
          uri: z.string().describe('The document URI'),
          diagnostic: diagnosticSchema.describe('The diagnostic to execute the command on'),
        }),
      },
    ),
  ];
}

export function createApplyEditTool(applyEdit: (uri: string, edits: unknown[]) => Promise<void>): StructuredTool {
  const positionSchema = z.object({ line: z.number(), character: z.number() });
  const rangeSchema = z.object({ start: positionSchema, end: positionSchema });
  return tool(
    async ({ uri, edits }) => {
      await applyEdit(uri, edits);
      return JSON.stringify({ success: true });
    },
    {
      name: 'appy_edit',
      description:
        'Applies a list of text edits to a document. Each edit replaces the text in a range with new text. Use this tool to make changes to documents instead of `edit_file`.',
      schema: z.object({
        uri: z.string().describe('The URI of the document to edit.'),
        edits: z
          .array(
            z.object({
              range: rangeSchema.describe('The range of text to replace.'),
              newText: z.string().describe('The replacement text.'),
            }),
          )
          .describe('The text edits to apply.'),
      }),
    },
  );
}

export function createDocumentAccessorTools<T extends Document = Document>(
  documents: DocumentAccessor<T>,
): StructuredTool[] {
  return [
    tool(
      async () => {
        const docs = await documents.active();
        return JSON.stringify(docs.map((doc) => ({ uri: doc.uri, format: doc.format })));
      },
      {
        name: 'get_active_documents',
        description: 'Returns a list of all documents currently open in the workspace with their URIs and formats.',
        schema: z.object({}),
      },
    ),
    tool(
      async ({ uri }: { uri: string }) => {
        const doc = await documents.get(uri);
        if (doc == null) {
          return JSON.stringify({ error: `Document not found: ${uri}` });
        }
        return JSON.stringify({ uri: doc.uri, format: doc.format, version: doc.version, content: doc.getText() });
      },
      {
        name: 'get_document',
        description: 'Returns the URI, format, version, and full text content of a workspace document by URI.',
        schema: z.object({ uri: z.string().describe('The URI of the document to retrieve.') }),
      },
    ),
  ];
}
