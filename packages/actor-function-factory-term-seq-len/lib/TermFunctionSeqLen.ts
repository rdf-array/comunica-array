import { TermFunctionBase } from '@comunica/bus-function-factory';
import type { Sequence } from '@comunica/utils-expression-evaluator';
import {
  declare,
  integer,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * rdf-array: `SEQLEN(e)` is the number of members of the sequence e; anything else is an error.
 * https://rdf-array.github.io/rdf-array/docs/array-syntax.html
 */
export class TermFunctionSeqLen extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.SEQLEN,
      overloads: declare(SparqlOperator.SEQLEN)
        .set([ 'sequence' ], () => ([ sequence ]: [ Sequence ]) => integer(sequence.elements.length))
        .collect(),
    });
  }
}
