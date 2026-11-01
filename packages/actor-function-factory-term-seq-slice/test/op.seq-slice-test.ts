import { ActorFunctionFactoryExpressionSeq } from '@comunica/actor-function-factory-expression-seq';
import { createFuncMediator, generalEvaluate, getMockEEFactory, template } from '@comunica/utils-jest';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { ActorFunctionFactoryTermSeqSlice } from '../lib';
import 'jest-rdf';

const DF = new DataFactory();
const int = (value: string): RDF.Literal => DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#integer'));

describe('the slices expr[m...n] and expr[m...] (rdf-array)', () => {
  const exprEvalFactory = getMockEEFactory({
    mediatorFunctionFactory: createFuncMediator([
      args => new ActorFunctionFactoryTermSeqSlice(args),
      args => new ActorFunctionFactoryExpressionSeq(args),
    ], {}),
  });
  const evaluate = async(expression: string): Promise<RDF.Term> =>
    (await generalEvaluate({ expression: template(expression), exprEvalFactory })).asyncResult;

  it('takes the members from m to n, both included and counting from 1', async() => {
    await expect(evaluate('SEQ(1, 2, 3)[2...3]')).resolves.toEqualRdfTerm(DF.sequence([ int('2'), int('3') ]));
    await expect(evaluate('SEQ(1, 2, 3)[1...1]')).resolves.toEqualRdfTerm(DF.sequence([ int('1') ]));
    await expect(evaluate('SEQ(1, 2, 3)[...2]')).resolves.toEqualRdfTerm(DF.sequence([ int('1'), int('2') ]));
    await expect(evaluate('SEQ(1, 2, 3)[2.0...3.0]')).resolves.toEqualRdfTerm(DF.sequence([ int('2'), int('3') ]));
  });

  it('takes the members from m on', async() => {
    await expect(evaluate('SEQ(1, 2, 3)[2...]')).resolves.toEqualRdfTerm(DF.sequence([ int('2'), int('3') ]));
    await expect(evaluate('SEQ(1, 2, 3)[1...]')).resolves.toEqualRdfTerm(DF.sequence([ int('1'), int('2'), int('3') ]));
  });

  it('clamps the range to the sequence', async() => {
    await expect(evaluate('SEQ(4, 5)[2...3]')).resolves.toEqualRdfTerm(DF.sequence([ int('5') ]));
    await expect(evaluate('SEQ(4, 5)[3...]')).resolves.toEqualRdfTerm(DF.sequence([]));
    await expect(evaluate('SEQ()[2...]')).resolves.toEqualRdfTerm(DF.sequence([]));
    await expect(evaluate('SEQ(1, 2, 3)[2...1]')).resolves.toEqualRdfTerm(DF.sequence([]));
    await expect(evaluate('SEQ(1, 2, 3)[1...0]')).resolves.toEqualRdfTerm(DF.sequence([]));
  });

  it('errors on a start below 1, an end below 0, or ends that are not whole numbers', async() => {
    await expect(evaluate('SEQ(1, 2, 3)[0...2]')).rejects
      .toThrow('Sequence slice [0...2] needs a whole start from 1 and a whole end from 0');
    await expect(evaluate('SEQ(1, 2, 3)[0...]')).rejects
      .toThrow('Sequence slice [0...] needs a whole start from 1 and a whole end from 0');
    await expect(evaluate('SEQ(1, 2, 3)[1...-1]')).rejects
      .toThrow('Sequence slice [1...-1] needs a whole start from 1 and a whole end from 0');
    await expect(evaluate('SEQ(1, 2, 3)[1.5...2]')).rejects.toThrow('Sequence slice [1.5...2]');
    await expect(evaluate('SEQ(1, 2, 3)[1...2.5]')).rejects.toThrow('Sequence slice [1...2.5]');
  });

  it('errors when the operands are not a sequence and numbers', async() => {
    await expect(evaluate('1[1...2]')).rejects.toThrow('Argument types not valid for operator');
    await expect(evaluate('SEQ(1)["1"...2]')).rejects.toThrow('Argument types not valid for operator');
    await expect(evaluate('SEQ(1)[1..."2"]')).rejects.toThrow('Argument types not valid for operator');
    await expect(evaluate('?unbound[1...]')).rejects.toThrow('Unbound variable');
  });
});
