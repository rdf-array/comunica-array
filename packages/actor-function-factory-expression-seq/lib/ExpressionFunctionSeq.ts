import { ExpressionFunctionBase } from '@comunica/bus-function-factory';
import type { IEvalContext, TermExpression } from '@comunica/types';
import type { Term } from '@comunica/utils-expression-evaluator';
import { Sequence, SparqlOperator } from '@comunica/utils-expression-evaluator';

/**
 * rdf-array: `SEQ(e1, e2, ...)` is the sequence of its arguments' values, `SEQ()` the empty sequence; an
 * argument that errors makes the call error.
 * https://rdf-array.github.io/rdf-array/docs/array-syntax.html
 */
export class ExpressionFunctionSeq extends ExpressionFunctionBase {
  public constructor() {
    super({
      arity: Number.POSITIVE_INFINITY,
      operator: SparqlOperator.SEQ,
      apply: async({ args, mapping, exprEval }: IEvalContext): Promise<TermExpression> => new Sequence(
        <Term[]> await Promise.all(args.map(arg => exprEval.evaluatorExpressionEvaluation(arg, mapping))),
      ),
    });
  }
}
