import { ActorFunctionFactoryTermAddition } from '@comunica/actor-function-factory-term-addition';
import { TermFunctionEquality } from '@comunica/actor-function-factory-term-equality';
import * as Eval from '@comunica/utils-expression-evaluator';
import {
  createFuncMediator,
  getMockEEActionContext,
  getMockEEFactory,
  getMockExpression,
} from '@comunica/utils-jest';
import { TermFunctionLesserThan } from '../lib/TermFunctionLesserThan';

describe('lesser than', () => {
  describe('on sparql star triples', () => {
    it('allows Generalized RDF Triples', async() => {
      const op = new TermFunctionLesserThan(new TermFunctionEquality());
      const dg = new Eval.DefaultGraph();
      expect(op.applyOnTerms(
        [
          new Eval.Quad(
            new Eval.IntegerLiteral(2),
            new Eval.IntegerLiteral(2),
            new Eval.IntegerLiteral(2),
            dg,
          ),
          new Eval.Quad(
            new Eval.IntegerLiteral(2),
            new Eval.IntegerLiteral(3),
            new Eval.IntegerLiteral(2),
            dg,
          ),
        ],
        await getMockEEFactory({
          mediatorFunctionFactory: createFuncMediator([
            args => new ActorFunctionFactoryTermAddition(args),
          ], {}),
        }).run({
          algExpr: getMockExpression(),
          context: getMockEEActionContext(),
        }, undefined),
      )).toEqual(new Eval.BooleanLiteral(true));

      expect(op.applyOnTerms(
        [
          new Eval.Quad(
            new Eval.IntegerLiteral(2),
            new Eval.IntegerLiteral(2),
            new Eval.IntegerLiteral(2),
            dg,
          ),
          new Eval.Quad(
            new Eval.IntegerLiteral(3),
            new Eval.IntegerLiteral(2),
            new Eval.IntegerLiteral(2),
            dg,
          ),
        ],
        await getMockEEFactory({
          mediatorFunctionFactory: createFuncMediator([
            args => new ActorFunctionFactoryTermAddition(args),
          ], {}),
        }).run({
          algExpr: getMockExpression(),
          context: getMockEEActionContext(),
        }, undefined),
      )).toEqual(new Eval.BooleanLiteral(true));
    });
  });

  describe('on RDF- sequences', () => {
    it('orders sequences element by element, a shorter one before a longer one with the same prefix', async() => {
      const op = new TermFunctionLesserThan(new TermFunctionEquality());
      const evaluator = await getMockEEFactory({
        mediatorFunctionFactory: createFuncMediator([
          args => new ActorFunctionFactoryTermAddition(args),
        ], {}),
      }).run({
        algExpr: getMockExpression(),
        context: getMockEEActionContext(),
      }, undefined);
      const seq = (...values: number[]): Eval.Sequence =>
        new Eval.Sequence(values.map(value => new Eval.IntegerLiteral(value)));

      expect(op.applyOnTerms([ seq(1, 2), seq(1, 3) ], evaluator)).toEqual(new Eval.BooleanLiteral(true));
      expect(op.applyOnTerms([ seq(1, 3), seq(1, 2) ], evaluator)).toEqual(new Eval.BooleanLiteral(false));
      expect(op.applyOnTerms([ seq(1), seq(1, 2) ], evaluator)).toEqual(new Eval.BooleanLiteral(true));
      expect(op.applyOnTerms([ seq(1, 2), seq(1, 2) ], evaluator)).toEqual(new Eval.BooleanLiteral(false));
      expect(op.applyOnTerms([ seq(), seq() ], evaluator)).toEqual(new Eval.BooleanLiteral(false));
      expect(op.applyOnTerms([ new Eval.Sequence([ seq(1) ]), new Eval.Sequence([ seq(2) ]) ], evaluator))
        .toEqual(new Eval.BooleanLiteral(true));
    });
  });
});
