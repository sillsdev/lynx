import {
  Range,
  ScriptureChapter,
  ScriptureCharacterStyle,
  ScriptureEditFactory,
  ScriptureMilestone,
  ScriptureNode,
  ScriptureNodeType,
  ScriptureNote,
  ScriptureParagraph,
  ScriptureRef,
  ScriptureVerse,
} from '@sillsdev/lynx';
import cloneDeep from 'lodash.clonedeep';
import Delta, { Op } from 'quill-delta';
import { v4 as uuidv4 } from 'uuid';

import { DeltaEditFactory } from './delta-edit-factory';
import { ScriptureDeltaDocument } from './scripture-delta-document';

export class ScriptureDeltaEditFactory
  extends DeltaEditFactory<ScriptureDeltaDocument>
  implements ScriptureEditFactory<ScriptureDeltaDocument, Op>
{
  createScriptureEdit(document: ScriptureDeltaDocument, range: Range, nodes: ScriptureNode[] | ScriptureNode): Op[] {
    const startOffset = document.offsetAt(range.start);
    const endOffset = document.offsetAt(range.end);
    const delta = new Delta();
    if (startOffset > 0) {
      delta.retain(startOffset);
    }
    if (endOffset - startOffset > 0) {
      delta.delete(endOffset - startOffset);
    }
    if (Array.isArray(nodes)) {
      for (const node of nodes) {
        serializeNode(delta, node);
      }
    } else {
      serializeNode(delta, nodes);
    }
    return delta.ops;
  }
}

function serializeNode(delta: Delta, node: ScriptureNode, attributes?: Record<string, unknown>): void {
  switch (node.type) {
    case ScriptureNodeType.Text: {
      delta.insert(node.getText(), attributes);
      break;
    }

    case ScriptureNodeType.Verse: {
      const verse = node as ScriptureVerse;
      delta.insert({ verse: { number: verse.number, style: 'v' } });
      break;
    }

    case ScriptureNodeType.Chapter: {
      const chapter = node as ScriptureChapter;
      delta.insert({ chapter: { number: chapter.number, style: 'c' } });
      break;
    }

    case ScriptureNodeType.Paragraph: {
      const para = node as ScriptureParagraph;
      serializeChildNodes(delta, para, attributes);
      delta.insert('\n', { para: { style: para.style } });
      break;
    }

    case ScriptureNodeType.CharacterStyle: {
      const style = node as ScriptureCharacterStyle;
      const newChildAttributes = attributes != null ? cloneDeep(attributes) : {};
      const existingCharAttributes = newChildAttributes.char;
      const newCharAttributes = cloneDeep(style.attributes);
      if (!('cid' in newCharAttributes)) {
        newCharAttributes.cid = uuidv4();
      }
      if (existingCharAttributes == null) {
        newChildAttributes.char = newCharAttributes;
      } else if (typeof existingCharAttributes === 'object') {
        newChildAttributes.char = [existingCharAttributes, newCharAttributes];
      } else if (Array.isArray(existingCharAttributes)) {
        existingCharAttributes.push(newCharAttributes);
      }
      serializeChildNodes(delta, style, newChildAttributes);
      break;
    }

    case ScriptureNodeType.Note: {
      const note = node as ScriptureNote;
      const noteAttributes: any = { style: note.style, caller: note.caller };
      if (note.category != null) {
        noteAttributes.category = note.category;
      }
      const contents = new Delta();
      serializeChildNodes(contents, note);
      if (contents.ops.length > 0) {
        noteAttributes.contents = { ops: contents.ops };
      }
      delta.insert({ note: noteAttributes }, attributes);
      break;
    }

    case ScriptureNodeType.Ref: {
      const ref = node as ScriptureRef;
      const newRefAttributes = attributes != null ? cloneDeep(attributes) : {};
      newRefAttributes.ref = { loc: ref.target };
      delta.insert(ref.display, newRefAttributes);
      break;
    }

    case ScriptureNodeType.Milestone: {
      const milestone = node as ScriptureMilestone;
      delta.insert({ ms: { style: milestone.style } }, attributes);
      break;
    }

    case ScriptureNodeType.OptBreak: {
      delta.insert({ optbreak: {} }, attributes);
      break;
    }

    default: {
      throw new Error(`Unsupported node type: ${node.type.toString()}.`);
    }
  }
}

function serializeChildNodes(delta: Delta, node: ScriptureNode, attributes?: Record<string, unknown>): void {
  for (const child of node.children) {
    serializeNode(delta, child, attributes);
  }
}