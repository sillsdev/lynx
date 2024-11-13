import { describe, expect, it } from 'vitest';

import { AmbiguousPunctuationMap } from '../../src/rule-set/rule-utils';

describe('AmbiguousPunctuationMap tests', () => {
  it('starts out empty', () => {
    const ambiguousPunctuationMap: AmbiguousPunctuationMap = new AmbiguousPunctuationMap();

    expect(ambiguousPunctuationMap.getAmbiguousMarks()).toEqual([]);
    expect(ambiguousPunctuationMap.lookUpAmbiguousMark('a')).toEqual([]);
    expect(ambiguousPunctuationMap.lookUpAmbiguousMark('"')).toEqual([]);
  });

  it('allows for basic insertion and lookup', () => {
    const ambiguousPunctuationMap: AmbiguousPunctuationMap = new AmbiguousPunctuationMap();

    ambiguousPunctuationMap.mapAmbiguousPunctuation('a', 'b');
    expect(ambiguousPunctuationMap.getAmbiguousMarks()).toEqual(['a']);
    expect(ambiguousPunctuationMap.lookUpAmbiguousMark('a')).toEqual(['b']);
    expect(ambiguousPunctuationMap.lookUpAmbiguousMark('b')).toEqual([]);

    ambiguousPunctuationMap.mapAmbiguousPunctuation(':', ';');
    expect(ambiguousPunctuationMap.getAmbiguousMarks()).toEqual(['a', ':']);
    expect(ambiguousPunctuationMap.lookUpAmbiguousMark('a')).toEqual(['b']);
    expect(ambiguousPunctuationMap.lookUpAmbiguousMark(':')).toEqual([';']);
  });

  it('stores multiple values for a single key', () => {
    const ambiguousPunctuationMap: AmbiguousPunctuationMap = new AmbiguousPunctuationMap();

    ambiguousPunctuationMap.mapAmbiguousPunctuation('a', 'b');
    ambiguousPunctuationMap.mapAmbiguousPunctuation('a', 'c');
    ambiguousPunctuationMap.mapAmbiguousPunctuation('a', 'd');
    expect(ambiguousPunctuationMap.getAmbiguousMarks()).toEqual(['a']);
    expect(ambiguousPunctuationMap.lookUpAmbiguousMark('a')).toEqual(['b', 'c', 'd']);
    expect(ambiguousPunctuationMap.lookUpAmbiguousMark('d')).toEqual([]);
  });
});
