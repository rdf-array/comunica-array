import { ExpressionFunctionBase } from '@comunica/bus-function-factory';
import type { IEvalContext, TermExpression } from '@comunica/types';
import type { Term } from '@comunica/utils-expression-evaluator';
import { Sequence, SparqlOperator, UnboundVariableError, Undef } from '@comunica/utils-expression-evaluator';

/**
 * rdf-array: `SEQ(e1, e2, ...)` is the sequence of its arguments' values, `SEQ()` the empty sequence; an
 * argument that errors makes the call error. rdf-undef: an unbound variable as an argument, and `undef`, write
 * an empty slot; any other error stays the error of the call.
 * https://rdf-array.github.io/rdf-array/docs/array-syntax.html
 */
export class ExpressionFunctionSeq extends ExpressionFunctionBase {
  public constructor() {
    super({
      arity: Number.POSITIVE_INFINITY,
      operator: SparqlOperator.SEQ,
      apply: async({ args, mapping, exprEval }: IEvalContext): Promise<TermExpression> => new Sequence(
        <Term[]> await Promise.all(args.map(async(arg) => {
          try {
            return await exprEval.evaluatorExpressionEvaluation(arg, mapping);
          } catch (error: unknown) {
            if (error instanceof UnboundVariableError) {
              return new Undef();
            }
            throw error;
          }
        })),
      ),
    });
  }
}
