import { TermFunctionBase } from '@comunica/bus-function-factory';
import type { NumericLiteral, Sequence } from '@comunica/utils-expression-evaluator';
import {
  declare,
  ExpressionError,
  SparqlOperator,
  TypeAlias,
} from '@comunica/utils-expression-evaluator';

/**
 * rdf-array: an index out of the range of a sequence, or not a whole number.
 */
export class SequenceIndexError extends ExpressionError {
  public constructor(index: number, length: number) {
    super(`Sequence index ${index} is not a whole number from 1 to ${length}`);
  }
}

/**
 * Rdf-undef: an index at an empty slot, an error as an index out of range is.
 */
export class SequenceSlotError extends ExpressionError {
  public constructor(position: number) {
    super(`The sequence has an empty slot at position ${position}`);
  }
}

/**
 * rdf-array: `expr[i]` is the i-th member of a sequence, counting from 1; an index out of range is an error,
 * and so (rdf-undef) is an index at an empty slot.
 * https://rdf-array.github.io/rdf-array/docs/array-syntax.html
 */
export class TermFunctionSeqIndex extends TermFunctionBase {
  public constructor() {
    super({
      arity: 2,
      operator: SparqlOperator.SEQ_INDEX,
      overloads: declare(SparqlOperator.SEQ_INDEX)
        .set(
          [ 'sequence', TypeAlias.SPARQL_NUMERIC ],
          () => ([ sequence, index ]: [ Sequence, NumericLiteral ]) => {
            const position = index.typedValue;
            if (!Number.isInteger(position) || position < 1 || position > sequence.elements.length) {
              throw new SequenceIndexError(position, sequence.elements.length);
            }
            const member = sequence.elements[position - 1];
            // Rdf-undef: a slot has no value to give
            if (member.termType === 'undef') {
              throw new SequenceSlotError(position);
            }
            return member;
          },
        )
        .collect(),
    });
  }
}
