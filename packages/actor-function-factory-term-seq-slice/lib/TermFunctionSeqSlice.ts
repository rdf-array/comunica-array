import { TermFunctionBase } from '@comunica/bus-function-factory';
import type { NumericLiteral } from '@comunica/utils-expression-evaluator';
import {
  declare,
  ExpressionError,
  Sequence,
  SparqlOperator,
  TypeAlias,
} from '@comunica/utils-expression-evaluator';

/**
 * rdf-array: a slice end that is not a whole number, a start below 1 or an end below 0.
 */
export class SequenceSliceError extends ExpressionError {
  public constructor(from: number, to: number | undefined) {
    super(`Sequence slice [${from}...${to ?? ''}] needs a whole start from 1 and a whole end from 0`);
  }
}

/**
 * rdf-array: `expr[m...n]` is the sequence of the members m to n, both included and counting from 1, and
 * `expr[m...]` the members from m on; the range is clamped to the sequence, so `(4 5)[2...3]` is `(5)`.
 * https://rdf-array.github.io/rdf-array/docs/array-syntax.html
 */
export class TermFunctionSeqSlice extends TermFunctionBase {
  public constructor() {
    super({
      arity: [ 2, 3 ],
      operator: SparqlOperator.SEQ_SLICE,
      overloads: declare(SparqlOperator.SEQ_SLICE)
        .set(
          [ 'sequence', TypeAlias.SPARQL_NUMERIC ],
          () => ([ sequence, from ]: [ Sequence, NumericLiteral ]) =>
            TermFunctionSeqSlice.slice(sequence, from.typedValue),
        )
        .set(
          [ 'sequence', TypeAlias.SPARQL_NUMERIC, TypeAlias.SPARQL_NUMERIC ],
          () => ([ sequence, from, to ]: [ Sequence, NumericLiteral, NumericLiteral ]) =>
            TermFunctionSeqSlice.slice(sequence, from.typedValue, to.typedValue),
        )
        .collect(),
    });
  }

  public static slice(sequence: Sequence, from: number, to?: number): Sequence {
    if (!Number.isInteger(from) || from < 1 || (to !== undefined && (!Number.isInteger(to) || to < 0))) {
      throw new SequenceSliceError(from, to);
    }
    return new Sequence(sequence.elements.slice(from - 1, to));
  }
}
