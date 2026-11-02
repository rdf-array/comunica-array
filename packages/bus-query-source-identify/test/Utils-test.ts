import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import {
  filterMatchingQuotedQuads,
  hasGaps,
  hasSequenceMemberVariables,
  matchPatternGaps,
  getDuplicateElementLinks,
  getVariables,
  isTermVariable,
  quadsMetadataToBindingsMetadata,
  quadsOrderToBindingsOrder,
  quadsToBindings,
  setMetadata,
} from '../lib';
import '@comunica/utils-jest';
import 'jest-rdf';

const quad = require('rdf-quad');

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const AF = new AlgebraFactory();

describe('Utils', () => {
  describe('quadsToBindings', () => {
    it('converts triples', async() => {
      // Prepare data
      const quadStream = new ArrayIterator([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
        quad('s3', 'p3', 'o3'),
      ], { autoStart: false });
      quadStream.setProperty('metadata', {
        cardinality: { type: 'exact', value: 3 },
        order: [
          { term: 'subject', direction: 'asc' },
          { term: 'predicate', direction: 'asc' },
          { term: 'object', direction: 'asc' },
          { term: 'graph', direction: 'asc' },
        ],
      });
      const pattern = AF.createPattern(
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
      );
      const bindingsStream = quadsToBindings(quadStream, pattern, DF, BF, false);

      // Check results
      await expect(bindingsStream).toEqualBindingsStream([
        BF.fromRecord({
          p: DF.namedNode('p1'),
        }),
        BF.fromRecord({
          p: DF.namedNode('p2'),
        }),
        BF.fromRecord({
          p: DF.namedNode('p3'),
        }),
      ]);

      // Check metadata
      const metadata = await new Promise(resolve => bindingsStream.getProperty('metadata', resolve));
      expect(metadata).toEqual({

        cardinality: { type: 'exact', value: 3 },
        order: [
          { term: DF.variable('p'), direction: 'asc' },
        ],
        variables: [
          { variable: DF.variable('p'), canBeUndef: false },
        ],
      });
    });

    it('converts triples without order metadata', async() => {
      // Prepare data
      const quadStream = new ArrayIterator([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
        quad('s3', 'p3', 'o3'),
      ], { autoStart: false });
      quadStream.setProperty('metadata', {
        cardinality: { type: 'exact', value: 3 },
      });
      const pattern = AF.createPattern(
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
      );
      const bindingsStream = quadsToBindings(quadStream, pattern, DF, BF, false);

      // Check results
      await expect(bindingsStream).toEqualBindingsStream([
        BF.fromRecord({
          p: DF.namedNode('p1'),
        }),
        BF.fromRecord({
          p: DF.namedNode('p2'),
        }),
        BF.fromRecord({
          p: DF.namedNode('p3'),
        }),
      ]);

      // Check metadata
      const metadata = await new Promise(resolve => bindingsStream.getProperty('metadata', resolve));
      expect(metadata).toEqual({

        cardinality: { type: 'exact', value: 3 },
        variables: [
          { variable: DF.variable('p'), canBeUndef: false },
        ],
      });
    });

    it('converts triples with available orders metadata', async() => {
      // Prepare data
      const quadStream = new ArrayIterator([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
        quad('s3', 'p3', 'o3'),
      ], { autoStart: false });
      quadStream.setProperty('metadata', {
        cardinality: { type: 'exact', value: 3 },
        availableOrders: [
          {
            cost: {
              cardinality: { type: 'exact', value: 123 },
              iterations: 1,
              persistedItems: 2,
              blockingItems: 3,
              requestTime: 4,
            },
            terms: [
              { term: 'subject', direction: 'asc' },
              { term: 'predicate', direction: 'asc' },
            ],
          },
          {
            cost: {
              cardinality: { type: 'exact', value: 456 },
              iterations: 1,
              persistedItems: 2,
              blockingItems: 3,
              requestTime: 4,
            },
            terms: [
              { term: 'object', direction: 'desc' },
              { term: 'graph', direction: 'desc' },
            ],
          },
        ],
      });
      const pattern = AF.createPattern(
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
      );
      const bindingsStream = quadsToBindings(quadStream, pattern, DF, BF, false);

      // Check results
      await expect(bindingsStream).toEqualBindingsStream([
        BF.fromRecord({
          p: DF.namedNode('p1'),
        }),
        BF.fromRecord({
          p: DF.namedNode('p2'),
        }),
        BF.fromRecord({
          p: DF.namedNode('p3'),
        }),
      ]);

      // Check metadata
      const metadata = await new Promise(resolve => bindingsStream.getProperty('metadata', resolve));
      expect(metadata).toEqual({

        cardinality: { type: 'exact', value: 3 },
        variables: [
          { variable: DF.variable('p'), canBeUndef: false },
        ],
        availableOrders: [
          {
            cost: {
              blockingItems: 3,
              cardinality: {
                type: 'exact',
                value: 123,
              },
              iterations: 1,
              persistedItems: 2,
              requestTime: 4,
            },
            terms: [
              {
                direction: 'asc',
                term: {
                  termType: 'Variable',
                  value: 'p',
                },
              },
            ],
          },
          {
            cost: {
              blockingItems: 3,
              cardinality: {
                type: 'exact',
                value: 456,
              },
              iterations: 1,
              persistedItems: 2,
              requestTime: 4,
            },
            terms: [],
          },
        ],
      });
    });

    it('converts quads', async() => {
      // Prepare data
      const quadStream = new ArrayIterator([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2', 'g1'),
        quad('s3', 'p3', 'o3', 'g2'),
      ], { autoStart: false });
      quadStream.setProperty('metadata', {
        cardinality: { type: 'exact', value: 3 },
        order: [
          { term: 'subject', direction: 'asc' },
          { term: 'predicate', direction: 'asc' },
          { term: 'object', direction: 'asc' },
          { term: 'graph', direction: 'asc' },
        ],
      });
      const pattern = AF.createPattern(
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
        DF.variable('g'),
      );
      const bindingsStream = quadsToBindings(quadStream, pattern, DF, BF, false);

      // Check results
      await expect(bindingsStream).toEqualBindingsStream([
        BF.fromRecord({
          p: DF.namedNode('p2'),
          g: DF.namedNode('g1'),
        }),
        BF.fromRecord({
          p: DF.namedNode('p3'),
          g: DF.namedNode('g2'),
        }),
      ]);

      // Check metadata
      const metadata = await new Promise(resolve => bindingsStream.getProperty('metadata', resolve));
      expect(metadata).toEqual({

        cardinality: { type: 'estimate', value: 3 },
        order: [
          { term: DF.variable('p'), direction: 'asc' },
          { term: DF.variable('g'), direction: 'asc' },
        ],
        variables: [
          { variable: DF.variable('p'), canBeUndef: false },
          { variable: DF.variable('g'), canBeUndef: false },
        ],
      });
    });

    it('converts quads with union default graph', async() => {
      // Prepare data
      const quadStream = new ArrayIterator([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2', 'g1'),
        quad('s3', 'p3', 'o3', 'g2'),
      ], { autoStart: false });
      quadStream.setProperty('metadata', {
        cardinality: { type: 'exact', value: 3 },
        order: [
          { term: 'subject', direction: 'asc' },
          { term: 'predicate', direction: 'asc' },
          { term: 'object', direction: 'asc' },
          { term: 'graph', direction: 'asc' },
        ],
      });
      const pattern = AF.createPattern(
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
        DF.variable('g'),
      );
      const bindingsStream = quadsToBindings(quadStream, pattern, DF, BF, true);

      // Check results
      await expect(bindingsStream).toEqualBindingsStream([
        BF.fromRecord({
          p: DF.namedNode('p1'),
          g: DF.defaultGraph(),
        }),
        BF.fromRecord({
          p: DF.namedNode('p2'),
          g: DF.namedNode('g1'),
        }),
        BF.fromRecord({
          p: DF.namedNode('p3'),
          g: DF.namedNode('g2'),
        }),
      ]);

      // Check metadata
      const metadata = await new Promise(resolve => bindingsStream.getProperty('metadata', resolve));
      expect(metadata).toEqual({

        cardinality: { type: 'exact', value: 3 },
        order: [
          { term: DF.variable('p'), direction: 'asc' },
          { term: DF.variable('g'), direction: 'asc' },
        ],
        variables: [
          { variable: DF.variable('p'), canBeUndef: false },
          { variable: DF.variable('g'), canBeUndef: false },
        ],
      });
    });

    it('converts triples with duplicate variables', async() => {
      // Prepare data
      const quadStream = new ArrayIterator([
        quad('s1', 's1', 'o1'),
        quad('s2', 'p2', 'o2'),
        quad('s3', 's1', 'o3'),
      ], { autoStart: false });
      quadStream.setProperty('metadata', {
        cardinality: { type: 'exact', value: 3 },
        order: [
          { term: 'subject', direction: 'asc' },
          { term: 'predicate', direction: 'asc' },
          { term: 'object', direction: 'asc' },
          { term: 'graph', direction: 'asc' },
        ],
      });
      const pattern = AF.createPattern(
        DF.variable('x'),
        DF.variable('x'),
        DF.namedNode('o'),
      );
      const bindingsStream = quadsToBindings(quadStream, pattern, DF, BF, false);

      // Check results
      await expect(bindingsStream).toEqualBindingsStream([
        BF.fromRecord({
          x: DF.namedNode('s1'),
        }),
      ]);

      // Check metadata
      const metadata = await new Promise(resolve => bindingsStream.getProperty('metadata', resolve));
      expect(metadata).toEqual({

        cardinality: { type: 'estimate', value: 3 },
        order: [
          { term: DF.variable('x'), direction: 'asc' },
        ],
        variables: [
          { variable: DF.variable('x'), canBeUndef: false },
        ],
      });
    });

    it('converts quoted triples with duplicate variables', async() => {
      // Prepare data
      const quadStream = new ArrayIterator([
        quad('s1', 'p1', '<<<o1s> <o1p> <o1o>>>'),
        quad('s2', 'p2', '<<<o2s> <o2p> <s2>>>'),
        quad('s3', 'p3', '<<<o3s> <o3p> <o3o>>>'),
      ], { autoStart: false });
      quadStream.setProperty('metadata', {
        cardinality: { type: 'exact', value: 3 },
      });
      const pattern = AF.createPattern(
        DF.variable('x'),
        DF.variable('p'),
        DF.quad(DF.variable('os'), DF.variable('op'), DF.variable('x')),
      );
      const bindingsStream = quadsToBindings(quadStream, pattern, DF, BF, false);

      // Check results
      await expect(bindingsStream).toEqualBindingsStream([
        BF.fromRecord({
          x: DF.namedNode('s2'),
          p: DF.namedNode('p2'),
          os: DF.namedNode('o2s'),
          op: DF.namedNode('o2p'),
        }),
      ]);

      // Check metadata
      const metadata = await new Promise(resolve => bindingsStream.getProperty('metadata', resolve));
      expect(metadata).toEqual({

        cardinality: { type: 'estimate', value: 3 },
        variables: [
          { variable: DF.variable('x'), canBeUndef: false },
          { variable: DF.variable('p'), canBeUndef: false },
          { variable: DF.variable('os'), canBeUndef: false },
          { variable: DF.variable('op'), canBeUndef: false },
        ],
      });
    });
  });

  describe('isTermVariable', () => {
    it('should be true for a variable', () => {
      expect(isTermVariable(DF.variable('v'))).toBeTruthy();
    });

    it('should be false for a blank node', () => {
      expect(isTermVariable(DF.blankNode())).toBeFalsy();
    });

    it('should be false for a named node', () => {
      expect(isTermVariable(DF.namedNode('n'))).toBeFalsy();
    });

    it('should be false for a quoted triple', () => {
      expect(isTermVariable(DF.quad(
        DF.namedNode('iri'),
        DF.namedNode('iri'),
        DF.namedNode('iri'),
      ))).toBeFalsy();
    });
  });

  describe('getVariables', () => {
    it('should get variables from a pattern', () => {
      expect(getVariables(
        AF.createPattern(DF.variable('v1'), DF.variable('v2'), DF.variable('v3')),
      )).toEqual([ DF.variable('v1'), DF.variable('v2'), DF.variable('v3') ]);
    });

    it('should get variables from a mixed pattern', () => {
      expect(getVariables(
        AF.createPattern(DF.namedNode('s1'), DF.namedNode('p'), DF.variable('v3')),
      )).toEqual([ DF.variable('v3') ]);
    });

    it('should get unique variables from a pattern', () => {
      expect(getVariables(
        AF.createPattern(DF.variable('v'), DF.variable('v'), DF.variable('v')),
      )).toEqual([ DF.variable('v') ]);
    });

    it('should get variables from a nested pattern', () => {
      expect(getVariables(
        AF.createPattern(DF.variable('v1'), DF.namedNode('p1'), DF.quad(
          DF.namedNode('s2'),
          DF.namedNode('p2'),
          DF.variable('v2'),
        )),
      )).toEqual([ DF.variable('v1'), DF.variable('v2') ]);
    });
  });

  describe('getDuplicateElementLinks', () => {
    it('should return falsy on patterns with different elements', () => {
      expect(getDuplicateElementLinks(quad('s', 'p', 'o', 'g')))
        .toBeFalsy();
    });

    it('should return falsy on patterns with different variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v2', '?v3', '?v4')))
        .toBeFalsy();
    });

    it('should return falsy on patterns when blank nodes and variables have the same value', () => {
      expect(getDuplicateElementLinks(quad('?v1', '_:v1', '?v3', '?v4')))
        .toBeFalsy();
    });

    it('should return correctly on patterns with equal subject and predicate variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v1', '?v3', '?v4')))
        .toEqual({ subject: [[ 'predicate' ]]});
    });

    it('should ignore patterns with equal subject and predicate blank nodes', () => {
      expect(getDuplicateElementLinks(quad('_:v1', '_:v1', '?v3', '?v4')))
        .toBeUndefined();
    });

    it('should return correctly on patterns with equal subject and object variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v2', '?v1', '?v4')))
        .toEqual({ subject: [[ 'object' ]]});
    });

    it('should return correctly on patterns with equal subject and graph variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v2', '?v3', '?v1')))
        .toEqual({ subject: [[ 'graph' ]]});
    });

    it('should return correctly on patterns with equal subject, predicate and object variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v1', '?v1', '?v4')))
        .toEqual({ subject: [[ 'predicate' ], [ 'object' ]]});
    });

    it('should return correctly on patterns with equal subject, predicate and graph variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v1', '?v3', '?v1')))
        .toEqual({ subject: [[ 'predicate' ], [ 'graph' ]]});
    });

    it('should return correctly on patterns with equal subject, object and graph variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v2', '?v1', '?v1')))
        .toEqual({ subject: [[ 'object' ], [ 'graph' ]]});
    });

    it('should return correctly on patterns with equal subject, predicate, object and graph variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v1', '?v1', '?v1')))
        .toEqual({ subject: [[ 'predicate' ], [ 'object' ], [ 'graph' ]]});
    });

    it('should return correctly on patterns with equal predicate and object variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v2', '?v2', '?v4')))
        .toEqual({ predicate: [[ 'object' ]]});
    });

    it('should return correctly on patterns with equal predicate and graph variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v2', '?v3', '?v2')))
        .toEqual({ predicate: [[ 'graph' ]]});
    });

    it('should return correctly on patterns with equal predicate, object and graph variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v2', '?v2', '?v2')))
        .toEqual({ predicate: [[ 'object' ], [ 'graph' ]]});
    });

    it('should return correctly on patterns with equal object and graph variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v2', '?v3', '?v3')))
        .toEqual({ object: [[ 'graph' ]]});
    });

    it('should return correctly on quoted patterns with equal SP and OP variables', () => {
      expect(getDuplicateElementLinks(quad('<<ex:s ?v1 ex:o>>', '?v2', '<<ex:s ?v1 ex:o>>', '?v4')))
        .toEqual({ subject_predicate: [[ 'object', 'predicate' ]]});
    });

    it('should return correctly on quoted patterns with equal SP, PO and OP variables', () => {
      expect(getDuplicateElementLinks(
        quad('<<ex:s ?v1 ex:o>>', '<<ex:s ex:p ?v1>>', '<<ex:s ?v1 ex:o>>', '?v4'),
      ))
        .toEqual({ subject_predicate: [[ 'predicate', 'object' ], [ 'object', 'predicate' ]]});
    });

    it('should return correctly on quoted patterns with equal SP and OP, and P and G variables', () => {
      expect(getDuplicateElementLinks(quad('<<ex:s ?v1 ex:o>>', '?v2', '<<ex:s ?v1 ex:o>>', '?v2')))
        .toEqual({ subject_predicate: [[ 'object', 'predicate' ]], predicate: [[ 'graph' ]]});
    });
  });

  describe('setMetadata', () => {
    it('should set bindings metadata', () => {
      const bindings = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
      const quads = new ArrayIterator<RDF.Quad>([], { autoStart: false });
      quads.setProperty('metadata', {
        cardinality: { type: 'estimate', value: 1 },
      });
      setMetadata(
        DF,
        bindings,
        quads,
        { subject: 'v1', object: 'v2' },
        [ DF.variable('v1'), DF.variable('v2') ],
        false,
      );
      expect(bindings.getProperty('metadata')).toEqual({
        cardinality: { type: 'estimate', value: 1 },
        variables: [
          { canBeUndef: false, variable: DF.variable('v1') },
          { canBeUndef: false, variable: DF.variable('v2') },
        ],
      });
    });

    it('should propagate metadata states', () => {
      const bindings = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
      const quads = new ArrayIterator<RDF.Quad>([], { autoStart: false });
      const stateIn = new MetadataValidationState();
      quads.setProperty('metadata', {
        state: stateIn,
        cardinality: { type: 'estimate', value: 1 },
      });
      setMetadata(
        DF,
        bindings,
        quads,
        { subject: 'v1', object: 'v2' },
        [ DF.variable('v1'), DF.variable('v2') ],
        false,
      );

      expect(bindings.getProperty('metadata')).toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 1 },
        variables: [
          { canBeUndef: false, variable: DF.variable('v1') },
          { canBeUndef: false, variable: DF.variable('v2') },
        ],
      });
      // eslint-disable-next-line ts/no-unnecessary-type-assertion
      expect((<any> bindings.getProperty('metadata')).state.valid).toBe(true);

      // Set a new state
      quads.setProperty('metadata', {
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 2 },
      });
      stateIn.invalidate();
      expect(bindings.getProperty('metadata')).toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 2 },
        variables: [
          { canBeUndef: false, variable: DF.variable('v1') },
          { canBeUndef: false, variable: DF.variable('v2') },
        ],
      });
      // eslint-disable-next-line ts/no-unnecessary-type-assertion
      expect((<any> bindings.getProperty('metadata')).state.valid).toBe(true);
    });
  });

  describe('quadsMetadataToBindingsMetadata', () => {
    it('translates quad metadata', () => {
      expect(quadsMetadataToBindingsMetadata(
        DF,
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
        },
        {
          subject: 'a',
        },
        [
          DF.variable('a'),
        ],
      )).toEqual({
        state: expect.any(MetadataValidationState),

        cardinality: { type: 'estimate', value: 10 },
        variables: [
          { variable: DF.variable('a'), canBeUndef: false },
        ],
      });
    });

    it('translates quad metadata with optional fields', () => {
      expect(quadsMetadataToBindingsMetadata(
        DF,
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          order: [{ term: 'subject', direction: 'asc' }],
          termOrder: [{ term: 'predicate', direction: 'asc' }, { term: 'subject', direction: 'asc' }],
          availableOrders: [
            {
              cost: {
                iterations: 10,
                persistedItems: 11,
                blockingItems: 12,
                requestTime: 13,
              },
              terms: [{ term: 'predicate', direction: 'asc' }],
            },
          ],
        },
        {
          subject: 'a',
          predicate: 'b',
        },
        [
          DF.variable('a'),
          DF.variable('b'),
        ],
      )).toEqual({
        state: expect.any(MetadataValidationState),

        cardinality: { type: 'estimate', value: 10 },
        variables: [
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('b'), canBeUndef: false },
        ],
        order: [{ term: DF.variable('a'), direction: 'asc' }],
        termOrder: [{ term: DF.variable('b'), direction: 'asc' }, { term: DF.variable('a'), direction: 'asc' }],
        availableOrders: [
          {
            cost: {
              iterations: 10,
              persistedItems: 11,
              blockingItems: 12,
              requestTime: 13,
            },
            terms: [{ term: DF.variable('b'), direction: 'asc' }],
          },
        ],
      });
    });
  });

  describe('quadsOrderToBindingsOrder', () => {
    it('handles a single order', () => {
      expect(quadsOrderToBindingsOrder(
        DF,
        [{ term: 'subject', direction: 'asc' }],
        { subject: 'a' },
      )).toEqual([{ term: DF.variable('a'), direction: 'asc' }]);
    });

    it('handles multiple orders', () => {
      expect(quadsOrderToBindingsOrder(
        DF,
        [
          { term: 'subject', direction: 'asc' },
          { term: 'object', direction: 'desc' },
        ],
        {
          subject: 'a',
          object: 'c',
        },
      )).toEqual([
        { term: DF.variable('a'), direction: 'asc' },
        { term: DF.variable('c'), direction: 'desc' },
      ]);
    });

    it('omits non-applicable quad orders', () => {
      expect(quadsOrderToBindingsOrder(
        DF,
        [
          { term: 'subject', direction: 'asc' },
          { term: 'predicate', direction: 'asc' },
          { term: 'object', direction: 'desc' },
        ],
        {
          subject: 'a',
          object: 'c',
          graph: 'd',
        },
      )).toEqual([
        { term: DF.variable('a'), direction: 'asc' },
        { term: DF.variable('c'), direction: 'desc' },
      ]);
    });
  });

  describe('filterMatchingQuotedQuads', () => {
    it('should not filter for non-quad terms', () => {
      const itIn: AsyncIterator<RDF.Quad> = new ArrayIterator([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
        quad('s3', 'p3', 'o3'),
      ], { autoStart: false });
      const itOut = filterMatchingQuotedQuads(
        DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
        itIn,
      );
      expect(itOut).toBe(itIn);
    });

    it('should filter for quad terms', async() => {
      const itIn: AsyncIterator<RDF.Quad> = new ArrayIterator([
        quad('s1', 'p1', '<<o1s o1p o>>'),
        quad('s2', 'p2', '<<o2s o2p o2>>'),
        quad('s3', 'p3', '<<o3s o3p o3>>'),
      ], { autoStart: false });
      const itOut = filterMatchingQuotedQuads(
        DF.quad(
          DF.variable('s1'),
          DF.variable('p1'),
          DF.quad(DF.variable('o1s'), DF.variable('o1p'), DF.namedNode('o')),
        ),
        itIn,
      );
      expect(itOut).not.toBe(itIn);
      await expect(itOut.toArray()).resolves.toBeRdfIsomorphic([
        quad('s1', 'p1', '<<o1s o1p o>>'),
      ]);
    });

    it('should filter for quad terms with common variables', async() => {
      const itIn: AsyncIterator<RDF.Quad> = new ArrayIterator([
        quad('s1', 'p1', '<<o1s o1p o>>'),
        quad('s2', 'p2', '<<a o2p a>>'),
        quad('s3', 'p3', '<<o3s o3p o3>>'),
      ], { autoStart: false });
      const itOut = filterMatchingQuotedQuads(
        DF.quad(
          DF.variable('s1'),
          DF.variable('p1'),
          DF.quad(DF.variable('x'), DF.variable('o1p'), DF.variable('x')),
        ),
        itIn,
      );
      expect(itOut).not.toBe(itIn);
      await expect(itOut.toArray()).resolves.toBeRdfIsomorphic([
        quad('s2', 'p2', '<<a o2p a>>'),
      ]);
    });
  });

  describe('rdf-undef slots', () => {
    const xsdInteger = DF.namedNode('http://www.w3.org/2001/XMLSchema#integer');
    const int = (value: string) => DF.literal(value, xsdInteger);
    const slot = DF.undef();
    const s = DF.namedNode('s');
    const p = DF.namedNode('p');
    const a = DF.variable('a');
    const b = DF.variable('b');
    const quads = (...objects: RDF.Term[]) => new ArrayIterator(objects
      .map(object => DF.quad(s, p, <RDF.Quad_Object> object)), { autoStart: false });

    function bindings(pattern: any, ...objects: RDF.Term[]): RDF.Bindings[] {
      const out: RDF.Bindings[] = [];
      const it = quadsToBindings(quads(...objects), pattern, DF, BF, false);
      it.on('data', binding => out.push(binding));
      return <any> new Promise((resolve, reject) => {
        it.on('end', () => resolve(out));
        it.on('error', reject);
      });
    }

    it('leaves a variable at a slot unbound', async() => {
      await expect(bindings(DF.quad(s, p, DF.sequence([ a, b ])), DF.sequence([ int('1'), slot ])))
        .resolves.toEqualBindingsArray([ BF.bindings([[ a, int('1') ]]) ]);
    });

    it('takes a repeated variable from the position with a value', async() => {
      await expect(bindings(
        DF.quad(s, p, DF.sequence([ a, a ])),
        DF.sequence([ int('1'), slot ]),
        DF.sequence([ slot, int('1') ]),
        DF.sequence([ slot, slot ]),
        DF.sequence([ int('1'), int('2') ]),
      )).resolves.toEqualBindingsArray([
        BF.bindings([[ a, int('1') ]]),
        BF.bindings([[ a, int('1') ]]),
        BF.bindings(),
      ]);
    });

    it('matches undef only with a slot, and a constant or a nested pattern with no slot', async() => {
      await expect(bindings(
        DF.quad(s, p, DF.sequence([ a, slot ])),
        DF.sequence([ int('1'), slot ]),
        DF.sequence([ int('1'), int('2') ]),
      )).resolves.toEqualBindingsArray([ BF.bindings([[ a, int('1') ]]) ]);
      await expect(bindings(DF.quad(s, p, DF.sequence([ a, int('2') ])), DF.sequence([ int('1'), slot ])))
        .resolves.toEqualBindingsArray([]);
      await expect(bindings(DF.quad(s, p, DF.sequence([ DF.sequence([ a ]) ])), DF.sequence([ slot ])))
        .resolves.toEqualBindingsArray([]);
    });

    it('takes a slot into a named gap, and through an unnamed one', async() => {
      const t = DF.variable('t');
      await expect(bindings(
        DF.quad(s, p, DF.sequence([ a, DF.variable('...t') ])),
        DF.sequence([ int('1'), slot, int('3') ]),
      )).resolves.toEqualBindingsArray([
        BF.bindings([[ a, int('1') ], [ t, DF.sequence([ slot, int('3') ]) ]]),
      ]);
    });

    it('says which variables may be undefined', () => {
      expect(hasSequenceMemberVariables(DF.quad(s, p, DF.sequence([ a ])))).toBe(true);
      expect(hasSequenceMemberVariables(DF.quad(a, p, DF.sequence([ int('1') ])))).toBe(false);
      const metadata = quadsMetadataToBindingsMetadata(
        DF,
        <any> { state: new MetadataValidationState(), cardinality: { type: 'exact', value: 1 }},
        { object_0: 'a', subject: 'b', object_1: 'b', object_2_subject: 'c' },
        [ a, b, DF.variable('c'), DF.variable('t') ],
      );
      expect(metadata.variables).toEqual([
        { variable: a, canBeUndef: true },
        { variable: b, canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: false },
        { variable: DF.variable('t'), canBeUndef: false },
      ]);
    });
  });

  describe('rdf-array sequences', () => {
    const xsdInteger = DF.namedNode('http://www.w3.org/2001/XMLSchema#integer');
    const int = (value: string) => DF.literal(value, xsdInteger);

    it('binds the variables inside a sequence pattern, nested ones included', async() => {
      const quadStream = new ArrayIterator([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.sequence([ int('1'), DF.sequence([ int('2'), int('3') ]) ])),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.sequence([ int('1') ])),
        DF.quad(DF.namedNode('s3'), DF.namedNode('p'), int('1')),
      ], { autoStart: false });
      const pattern = AF.createPattern(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.sequence([ DF.variable('x'), DF.sequence([ DF.variable('y'), int('3') ]) ]),
      );
      const bindingsStream = quadsToBindings(filterMatchingQuotedQuads(pattern, quadStream), pattern, DF, BF, false);
      await expect(bindingsStream).toEqualBindingsStream([
        BF.fromRecord({ s: DF.namedNode('s1'), x: int('1'), y: int('2') }),
      ]);
    });

    it('keeps only the quads whose sequence repeats a repeated variable', async() => {
      const quadStream = new ArrayIterator([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.sequence([ int('1'), int('1') ])),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.sequence([ int('1'), int('2') ])),
      ], { autoStart: false });
      const pattern = AF.createPattern(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.sequence([ DF.variable('a'), DF.variable('a') ]),
      );
      const bindingsStream = quadsToBindings(filterMatchingQuotedQuads(pattern, quadStream), pattern, DF, BF, false);
      await expect(bindingsStream).toEqualBindingsStream([
        BF.fromRecord({ s: DF.namedNode('s1'), a: int('1') }),
      ]);
    });

    it('filterMatchingQuotedQuads filters on sequence patterns', async() => {
      const itIn: AsyncIterator<RDF.Quad> = new ArrayIterator([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.sequence([ int('1'), int('2') ])),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.sequence([ int('1') ])),
        DF.quad(DF.namedNode('s3'), DF.namedNode('p'), DF.sequence([])),
      ], { autoStart: false });
      const itOut = filterMatchingQuotedQuads(
        DF.quad(DF.variable('s'), DF.namedNode('p'), DF.sequence([ DF.variable('x'), int('2') ])),
        itIn,
      );
      expect(itOut).not.toBe(itIn);
      await expect(itOut.toArray()).resolves.toEqualRdfQuadArray([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.sequence([ int('1'), int('2') ])),
      ]);
    });
  });
});

describe('rdf-array gaps', () => {
  const xsdInteger = DF.namedNode('http://www.w3.org/2001/XMLSchema#integer');
  const int = (value: string) => DF.literal(value, xsdInteger);
  const gap = DF.variable('...');
  const named = (name: string) => DF.variable(`...${name}`);
  const points = DF.sequence([
    DF.sequence([ int('0'), int('0') ]),
    DF.sequence([ int('3'), int('0') ]),
    DF.sequence([ int('3'), int('4') ]),
  ]);

  describe('hasGaps and getVariables', () => {
    it('sees gaps inside sequences only', () => {
      expect(hasGaps(AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.sequence([ gap ])))).toBe(true);
      expect(hasGaps(AF.createPattern(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.sequence([ DF.sequence([ named('t') ]) ]),
      ))).toBe(true);
      expect(hasGaps(AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.sequence([ DF.variable('x') ]))))
        .toBe(false);
      expect(hasGaps(AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')))).toBe(false);
    });

    it('binds a named gap to its variable and an unnamed gap to nothing', () => {
      const pattern = AF.createPattern(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.sequence([ DF.variable('h'), named('t'), gap, DF.variable('h') ]),
      );
      expect(getVariables(pattern)).toEqual([ DF.variable('s'), DF.variable('h'), DF.variable('t') ]);
    });
  });

  describe('matchPatternGaps', () => {
    const match = (pattern: RDF.Term, term: RDF.Term) => matchPatternGaps(
      DF.quad(DF.namedNode('s'), DF.namedNode('p'), <RDF.Quad_Object> term),
      DF.quad(DF.namedNode('s'), DF.namedNode('p'), <RDF.Quad_Object> pattern),
      DF,
    );

    it('matches a gap against every run, including the empty one', () => {
      expect(match(DF.sequence([ gap, DF.variable('x'), gap ]), DF.sequence([ int('1'), int('2') ])))
        .toEqual([{ x: int('1') }, { x: int('2') }]);
      expect(match(DF.sequence([ gap ]), DF.sequence([]))).toEqual([{}]);
      expect(match(DF.sequence([ DF.variable('x'), gap ]), DF.sequence([]))).toEqual([]);
      expect(match(DF.sequence([ gap ]), int('1'))).toEqual([]);
    });

    it('binds a named gap to the run as a sequence', () => {
      expect(match(DF.sequence([ DF.variable('h'), named('t') ]), points)).toEqual([
        { h: points.elements[0], t: DF.sequence([ points.elements[1], points.elements[2] ]) },
      ]);
      expect(match(DF.sequence([ named('pre'), DF.variable('x'), gap ]), points)).toEqual([
        { pre: DF.sequence([]), x: points.elements[0] },
        { pre: DF.sequence([ points.elements[0] ]), x: points.elements[1] },
        { pre: DF.sequence([ points.elements[0], points.elements[1] ]), x: points.elements[2] },
      ]);
    });

    it('requires repeated variables and named gaps to match equal values', () => {
      expect(match(
        DF.sequence([ DF.variable('a'), gap, DF.variable('a') ]),
        DF.sequence([ int('1'), int('2'), int('1') ]),
      )).toEqual([{ a: int('1') }]);
      expect(match(DF.sequence([ DF.variable('a'), gap, DF.variable('a') ]), DF.sequence([ int('1'), int('2') ])))
        .toEqual([]);
      expect(match(
        DF.sequence([ named('r'), int('0'), named('r') ]),
        DF.sequence([ int('1'), int('0'), int('1') ]),
      )).toEqual([{ r: DF.sequence([ int('1') ]) }]);
      expect(match(
        DF.sequence([ named('r'), int('0'), named('r') ]),
        DF.sequence([ int('1'), int('0'), int('2') ]),
      )).toEqual([]);
    });

    it('descends into nested sequences and quoted triples', () => {
      expect(match(
        DF.sequence([ gap, DF.sequence([ int('3'), DF.variable('y') ]), gap ]),
        points,
      )).toEqual([{ y: int('0') }, { y: int('4') }]);
      expect(match(
        DF.quad(DF.variable('qs'), DF.namedNode('q'), DF.sequence([ gap, DF.variable('last') ])),
        DF.quad(DF.namedNode('qs'), DF.namedNode('q'), DF.sequence([ int('1'), int('2') ])),
      )).toEqual([{ qs: DF.namedNode('qs'), last: int('2') }]);
      expect(match(
        DF.quad(DF.variable('qs'), DF.namedNode('q'), DF.sequence([ gap ])),
        int('1'),
      )).toEqual([]);
      expect(match(DF.sequence([ gap, int('9') ]), points)).toEqual([]);
    });
  });

  describe('quadsToBindings and filterMatchingQuotedQuads with gaps', () => {
    it('yields one binding per match and skips quads that do not match', async() => {
      const quadStream = new ArrayIterator([
        DF.quad(DF.namedNode('poly'), DF.namedNode('p'), points),
        DF.quad(DF.namedNode('short'), DF.namedNode('p'), DF.sequence([ int('1') ])),
        DF.quad(DF.namedNode('none'), DF.namedNode('p'), int('1')),
      ], { autoStart: false });
      const pattern = AF.createPattern(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.sequence([ named('pre'), DF.sequence([ DF.variable('x'), DF.variable('y') ]), gap ]),
      );
      const bindingsStream = quadsToBindings(filterMatchingQuotedQuads(pattern, quadStream), pattern, DF, BF, false);
      await expect(bindingsStream).toEqualBindingsStream([
        BF.fromRecord({ s: DF.namedNode('poly'), pre: DF.sequence([]), x: int('0'), y: int('0') }),
        BF.fromRecord({
          s: DF.namedNode('poly'),
          pre: DF.sequence([ points.elements[0] ]),
          x: int('3'),
          y: int('0'),
        }),
        BF.fromRecord({
          s: DF.namedNode('poly'),
          pre: DF.sequence([ points.elements[0], points.elements[1] ]),
          x: int('3'),
          y: int('4'),
        }),
      ]);
    });

    it('filters on the graph and estimates the cardinality', async() => {
      const quadStream = new ArrayIterator([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.sequence([ int('1'), int('2') ]), DF.namedNode('g')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.sequence([ int('1'), int('2') ])),
      ], { autoStart: false });
      quadStream.setProperty('metadata', {
        cardinality: { type: 'exact', value: 2 },
        state: new MetadataValidationState(),
      });
      const pattern = AF.createPattern(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.sequence([ gap, DF.variable('x') ]),
        DF.variable('g'),
      );
      const bindingsStream = quadsToBindings(quadStream, pattern, DF, BF, false);
      await expect(bindingsStream).toEqualBindingsStream([
        BF.fromRecord({ s: DF.namedNode('s1'), x: int('2'), g: DF.namedNode('g') }),
      ]);
      await expect(new Promise(resolve => bindingsStream.getProperty('metadata', resolve))).resolves
        .toMatchObject({
          cardinality: { type: 'estimate', value: 2 },
          variables: [
            { variable: DF.variable('s'), canBeUndef: false },
            { variable: DF.variable('x'), canBeUndef: true },
            { variable: DF.variable('g'), canBeUndef: false },
          ],
        });
    });
  });
});
