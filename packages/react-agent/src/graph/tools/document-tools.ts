import { StructuredTool, tool } from '@langchain/core/tools';
import { Document, DocumentAccessor } from '@sillsdev/lynx';
import { z } from 'zod';

export function createDocumentTools<T extends Document = Document>(documents: DocumentAccessor<T>): StructuredTool[] {
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
