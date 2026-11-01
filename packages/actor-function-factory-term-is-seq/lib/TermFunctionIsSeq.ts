import { TermFunctionBase } from '@comunica/bus-function-factory';
import {
  bool,
  declare,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * rdf-array: `isSEQ(e)` is true when e is a sequence, as `isIRI`, `isBlank` and `isLiteral` are false for one.
 * https://rdf-array.github.io/rdf-array/docs/array-syntax.html
 */
export class TermFunctionIsSeq extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.IS_SEQ,
      overloads: declare(SparqlOperator.IS_SEQ)
        .onTerm1(() => term => bool(term.termType === 'sequence'))
        .collect(),
    });
  }
}
