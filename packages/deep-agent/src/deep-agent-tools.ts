import { Document, DocumentAccessor, WorkspaceAccessor } from '@sillsdev/lynx';
import { tool } from 'langchain';
import { z } from 'zod';

import { DeepAgentToolDefinition } from './deep-agent-tool';

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

export function createWorkspaceTools<T>(workspace: WorkspaceAccessor<T>) {
  return [
    tool(
      async ({ uri }) => {
        const diagnostics = await workspace.getDiagnostics(uri);
        return JSON.stringify(diagnostics);
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
      async ({ uri, diagnostic }) => {
        const actions = await workspace.getDiagnosticActions(uri, diagnostic);
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
      async ({ uri, diagnostic }) => {
        const result = await workspace.dismissDiagnostic(uri, diagnostic);
        return JSON.stringify({ dismissed: result });
      },
      {
        name: 'dismiss_diagnostic',
        description: 'Dismiss a diagnostic so it no longer appears. The diagnostic must have a fingerprint.',
        schema: z.object({
          uri: z.string().describe('The document URI'),
          diagnostic: diagnosticSchema.describe('The diagnostic to dismiss'),
        }),
      },
    ),
    tool(
      async ({ command, uri, diagnostic }) => {
        const result = await workspace.executeDiagnosticActionCommand(command, uri, diagnostic);
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

export function createDocumentAccessorTools<T extends Document = Document>(
  documents: DocumentAccessor<T>,
): DeepAgentToolDefinition[] {
  return [
    {
      name: 'get_active_documents',
      description: 'Returns a list of all documents currently open in the workspace with their URIs and formats.',
      schema: z.object({}),
      async execute(_args: unknown) {
        const docs = await documents.active();
        return JSON.stringify(docs.map((doc) => ({ uri: doc.uri, format: doc.format })));
      },
    },
    {
      name: 'get_document',
      description: 'Returns the URI, format, version, and full text content of a workspace document by URI.',
      schema: z.object({ uri: z.string().describe('The URI of the document to retrieve.') }),
      async execute({ uri }: { uri: string }) {
        const doc = await documents.get(uri);
        if (doc == null) {
          return JSON.stringify({ error: `Document not found: ${uri}` });
        }
        return JSON.stringify({ uri: doc.uri, format: doc.format, version: doc.version, content: doc.getText() });
      },
    },
  ];
}
