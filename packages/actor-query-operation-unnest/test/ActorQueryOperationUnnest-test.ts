import { ActorFunctionFactoryTermSeqIndex } from '@comunica/actor-function-factory-term-seq-index';
import type {
  MediatorExpressionEvaluatorFactory,
} from '@comunica/bus-expression-evaluator-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import type { IActionContext, IQueryOperationResultBindings } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import * as sparqlee from '@comunica/utils-expression-evaluator';
import {
  createFuncMediator,
  getMockEEActionContext,
  getMockMediatorExpressionEvaluatorFactory,
} from '@comunica/utils-jest';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationUnnest } from '../lib';
import 'jest-rdf';

const DF = new DataFactory();
const BF = new BindingsFactory(DF, {});
const AF = new AlgebraFactory(DF);
const int = (value: string): RDF.Literal => DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#integer'));

describe('ActorQueryOperationUnnest', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
  let context: IActionContext;

  const example = (expression: any, position?: RDF.Variable) => AF.createUnnest(
    AF.createBgp([ AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')) ]),
    expression,
    DF.variable('x'),
    position,
  );

  const sequenceExpression = AF.createTermExpression(DF.variable('a'));
  // ?a[1]
  const indexExpression = AF.createOperatorExpression(
    'index',
    [ AF.createTermExpression(DF.variable('a')), AF.createTermExpression(int('1')) ],
  );

  const input = [
    BF.bindings([[ DF.variable('a'), DF.sequence([ int('1'), int('2') ]) ]]),
    BF.bindings([[ DF.variable('a'), DF.sequence([]) ]]),
    BF.bindings([[ DF.variable('a'), DF.literal('not a sequence') ]]),
    BF.bindings([[ DF.variable('b'), int('3') ]]),
  ];

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator(input, { autoStart: false }),
        metadata: () => Promise.resolve({
          cardinality: { type: 'exact', value: 4 },
          variables: [{ variable: DF.variable('a'), canBeUndef: true }],
        }),
        operated: arg,
        type: 'bindings',
      }),
    };
    mediatorExpressionEvaluatorFactory = getMockMediatorExpressionEvaluatorFactory({
      mediatorQueryOperation,
      mediatorFunctionFactory: createFuncMediator([
        args => new ActorFunctionFactoryTermSeqIndex(args),
      ], {}),
    });
    context = getMockEEActionContext();
  });

  describe('The ActorQueryOperationUnnest module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationUnnest).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationUnnest constructor', () => {
      expect(new (<any> ActorQueryOperationUnnest)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationUnnest);
      expect(new (<any> ActorQueryOperationUnnest)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });
  });

  describe('An ActorQueryOperationUnnest instance', () => {
    let actor: ActorQueryOperationUnnest;
    beforeEach(() => {
      actor = new ActorQueryOperationUnnest({
        name: 'actor',
        bus,
        mediatorQueryOperation,
        mediatorExpressionEvaluatorFactory,
      });
    });

    it('should test on unnest', async() => {
      const op: any = { operation: example(sequenceExpression), context };
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should not test on non-unnest', async() => {
      const op: any = { operation: { type: 'some-other-type' }, context };
      await expect(actor.test(op)).resolves.toFailTest(`Actor actor only supports unnest operations, but got some-other-type`);
    });

    it('should bind each member and its position, and drop empty, non-sequence and unbound values', async() => {
      const op: any = { operation: example(sequenceExpression, DF.variable('i')), context };
      const output: IQueryOperationResultBindings = <any> await actor.run(op, undefined);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('a'), DF.sequence([ int('1'), int('2') ]) ],
          [ DF.variable('x'), int('1') ],
          [ DF.variable('i'), int('1') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.sequence([ int('1'), int('2') ]) ],
          [ DF.variable('x'), int('2') ],
          [ DF.variable('i'), int('2') ],
        ]),
      ]);
      expect(output.type).toBe('bindings');
      await expect(output.metadata()).resolves.toMatchObject({
        cardinality: { type: 'estimate', value: 4 },
        variables: [
          { variable: DF.variable('a'), canBeUndef: true },
          { variable: DF.variable('x'), canBeUndef: true },
          { variable: DF.variable('i'), canBeUndef: false },
        ],
      });
    });

    it('should give a solution at an empty slot, with the member unbound', async() => {
      input.unshift(BF.bindings([[ DF.variable('a'), DF.sequence([ DF.undef(), int('2') ]) ]]));
      const output = <IQueryOperationResultBindings> await actor.run({
        operation: example(sequenceExpression, DF.variable('i')),
        context,
      }, undefined);
      input.shift();
      const sequence = DF.sequence([ DF.undef(), int('2') ]);
      const rows = await arrayifyStream(output.bindingsStream);
      expect(rows[0].has(DF.variable('x'))).toBe(false);
      expect(rows[0].get(DF.variable('i'))).toEqualRdfTerm(int('1'));
      expect(rows[0].get(DF.variable('a'))).toEqualRdfTerm(sequence);
      expect(rows[1].get(DF.variable('x'))).toEqualRdfTerm(int('2'));
      expect((await output.metadata()).variables).toEqual(expect.arrayContaining([
        { variable: DF.variable('x'), canBeUndef: true },
        { variable: DF.variable('i'), canBeUndef: false },
      ]));
    });

    it('should bind only the member without AT', async() => {
      const op: any = { operation: example(sequenceExpression), context };
      const output: IQueryOperationResultBindings = <any> await actor.run(op, undefined);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('a'), DF.sequence([ int('1'), int('2') ]) ],
          [ DF.variable('x'), int('1') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.sequence([ int('1'), int('2') ]) ],
          [ DF.variable('x'), int('2') ],
        ]),
      ]);
      await expect(output.metadata()).resolves.toMatchObject({
        variables: [
          { variable: DF.variable('a'), canBeUndef: true },
          { variable: DF.variable('x'), canBeUndef: true },
        ],
      });
    });

    it('should unnest the value of an expression, such as an index', async() => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.sequence([ DF.sequence([ int('1'), int('2') ]), int('3') ]) ]]),
          BF.bindings([[ DF.variable('a'), DF.sequence([]) ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({
          cardinality: { type: 'exact', value: 2 },
          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        }),
        operated: arg,
        type: 'bindings',
      });
      const op: any = { operation: example(indexExpression, DF.variable('i')), context };
      const output: IQueryOperationResultBindings = <any> await actor.run(op, undefined);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('a'), DF.sequence([ DF.sequence([ int('1'), int('2') ]), int('3') ]) ],
          [ DF.variable('x'), int('1') ],
          [ DF.variable('i'), int('1') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.sequence([ DF.sequence([ int('1'), int('2') ]), int('3') ]) ],
          [ DF.variable('x'), int('2') ],
          [ DF.variable('i'), int('2') ],
        ]),
      ]);
    });

    it('should emit an error when evaluation fails with a hard error', async() => {
      Object.defineProperty(sparqlee, 'isExpressionError', { writable: true });
      // eslint-disable-next-line jest/prefer-spy-on
      (<any> sparqlee).isExpressionError = jest.fn(() => false);

      const op: any = { operation: example(sequenceExpression), context };
      const output: IQueryOperationResultBindings = <any> await actor.run(op, undefined);
      await new Promise<void>((resolve, reject) => {
        output.bindingsStream.on('error', () => resolve());
        output.bindingsStream.on('end', reject);
        output.bindingsStream.on('data', () => {
          // Consume the stream so that it flows
        });
      });
    });

    it('throws if the member variable was already bound', async() => {
      const op: any = { operation: AF.createUnnest(
        AF.createBgp([]),
        sequenceExpression,
        DF.variable('a'),
      ), context };
      await expect(actor.run(op, undefined)).rejects.toThrow(`Illegal binding to variable 'a' that has already been bound`);
    });

    it('throws if the position variable was already bound', async() => {
      const op: any = { operation: example(sequenceExpression, DF.variable('a')), context };
      await expect(actor.run(op, undefined)).rejects.toThrow(`Illegal binding to variable 'a' that has already been bound`);
    });
  });
});
