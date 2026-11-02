import type { ITermFunction } from '@comunica/bus-function-factory';
import { ExpressionFunctionBase } from '@comunica/bus-function-factory';
import type { IEvalContext, TermExpression } from '@comunica/types';
import type { BooleanLiteral, Sequence } from '@comunica/utils-expression-evaluator';
import {
  bool,
  InError,
  InvalidArgumentTypes,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * rdf-array: `?x IN ?seq` is true when some member of the sequence equals `?x` under `=`, and `NOT IN` its
 * negation. As with `IN ( ... )`, a comparison that errors is an error only when no member is equal.
 * The right-hand side must be a sequence.
 * https://rdf-array.github.io/rdf-array/docs/array-syntax.html
 */
export class ExpressionFunctionInSeq extends ExpressionFunctionBase {
  public constructor(private readonly equalityFunction: ITermFunction, negated: boolean) {
    super({
      arity: 2,
      operator: negated ? SparqlOperator.NOT_IN_SEQ : SparqlOperator.IN_SEQ,
      apply: async(context: IEvalContext): Promise<TermExpression> => {
        const { args, mapping, exprEval } = context;
        const [ needle, haystack ] = await Promise.all(
          args.map(arg => exprEval.evaluatorExpressionEvaluation(arg, mapping)),
        );
        if (haystack.termType !== 'sequence') {
          throw new InvalidArgumentTypes([ needle, haystack ], this.operator);
        }
        const errors: Error[] = [];
        for (const member of (<Sequence> haystack).elements) {
          // Rdf-undef: IN looks at members, and a slot has none
          if (member.termType === 'undef') {
            continue;
          }
          try {
            if ((<BooleanLiteral> this.equalityFunction.applyOnTerms([ needle, member ], exprEval)).typedValue) {
              return bool(!negated);
            }
          } catch (error: unknown) {
            errors.push(<Error> error);
          }
        }
        if (errors.length > 0) {
          throw new InError(errors);
        }
        return bool(negated);
      },
    });
  }
}
