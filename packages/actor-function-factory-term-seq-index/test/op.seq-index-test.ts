import { ActorFunctionFactoryExpressionSeq } from '@comunica/actor-function-factory-expression-seq';
import { ActorFunctionFactoryTermAddition } from '@comunica/actor-function-factory-term-addition';
import { createFuncMediator, generalEvaluate, getMockEEFactory, template } from '@comunica/utils-jest';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { ActorFunctionFactoryTermSeqIndex } from '../lib';
import 'jest-rdf';

const DF = new DataFactory();
const int = (value: string): RDF.Literal => DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#integer'));

describe('the index expr[i] (rdf-array)', () => {
  const exprEvalFactory = getMockEEFactory({
    mediatorFunctionFactory: createFuncMediator([
      args => new ActorFunctionFactoryTermSeqIndex(args),
      args => new ActorFunctionFactoryExpressionSeq(args),
      args => new ActorFunctionFactoryTermAddition(args),
    ], {}),
  });
  const evaluate = async(expression: string): Promise<RDF.Term> =>
    (await generalEvaluate({ expression: template(expression), exprEvalFactory })).asyncResult;

  it('returns the member at a 1-based position', async() => {
    await expect(evaluate('SEQ(1, 2, 3)[1]')).resolves.toEqualRdfTerm(int('1'));
    await expect(evaluate('SEQ(1, 2, 3)[3]')).resolves.toEqualRdfTerm(int('3'));
    await expect(evaluate('SEQ(1, 2, 3)[2.0]')).resolves.toEqualRdfTerm(int('2'));
    await expect(evaluate('SEQ("a", <http://example.com>)[2]')).resolves.toEqualRdfTerm(DF.namedNode('http://example.com'));
  });

  it('chains into nested sequences and takes an index expression', async() => {
    await expect(evaluate('SEQ(SEQ(1, 2), SEQ(3))[1][2]')).resolves.toEqualRdfTerm(int('2'));
    await expect(evaluate('SEQ(SEQ(1, 2), SEQ(3))[1 + 1][1]')).resolves.toEqualRdfTerm(int('3'));
    await expect(evaluate('SEQ(SEQ(1, 2), SEQ(3))[1]')).resolves.toEqualRdfTerm(DF.sequence([ int('1'), int('2') ]));
  });

  it('errors at an empty slot, as out of range', async() => {
    await expect(evaluate('SEQ(1, undef, 3)[3]')).resolves.toEqualRdfTerm(int('3'));
    await expect(evaluate('SEQ(1, undef, 3)[2]')).rejects.toThrow('The sequence has an empty slot at position 2');
  });

  it('errors on an index out of range or not a whole number', async() => {
    await expect(evaluate('SEQ(1, 2, 3)[0]')).rejects.toThrow('Sequence index 0 is not a whole number from 1 to 3');
    await expect(evaluate('SEQ(1, 2, 3)[4]')).rejects.toThrow('Sequence index 4 is not a whole number from 1 to 3');
    await expect(evaluate('SEQ()[1]')).rejects.toThrow('Sequence index 1 is not a whole number from 1 to 0');
    await expect(evaluate('SEQ(1, 2, 3)[1.5]')).rejects.toThrow('Sequence index 1.5 is not a whole number from 1 to 3');
  });

  it('errors when the operands are not a sequence and a number', async() => {
    await expect(evaluate('1[1]')).rejects.toThrow('Argument types not valid for operator');
    await expect(evaluate('"abc"[1]')).rejects.toThrow('Argument types not valid for operator');
    await expect(evaluate('SEQ(1)["1"]')).rejects.toThrow('Argument types not valid for operator');
    await expect(evaluate('?unbound[1]')).rejects.toThrow('Unbound variable');
  });
});
