import type { MediatorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type {
  Bindings,
  ComunicaDataFactory,
  IActionContext,
  IQueryOperationResult,
  IQueryOperationResultBindings,
} from '@comunica/types';
import { Algebra } from '@comunica/utils-algebra';
import { isExpressionError } from '@comunica/utils-expression-evaluator';
import { getSafeBindings } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';

const XSD_INTEGER = 'http://www.w3.org/2001/XMLSchema#integer';

/**
 * A comunica Unnest Query Operation Actor (rdf-array).
 *
 * `UNNEST(expr AS ?x AT ?i)` yields, for each solution of its input, one solution per member of the sequence
 * that `expr` evaluates to, binding `?x` to the member and `?i` (when given) to its position, counting from 1.
 * A solution whose expression is unbound, errors or is not a sequence yields nothing.
 * https://rdf-array.github.io/rdf-array/docs/array-syntax.html
 */
export class ActorQueryOperationUnnest extends ActorQueryOperationTypedMediated<Algebra.Unnest> {
  private readonly mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;

  public constructor(args: IActorQueryOperationUnnestArgs) {
    super(args, Algebra.Types.UNNEST);
    this.mediatorExpressionEvaluatorFactory = args.mediatorExpressionEvaluatorFactory;
  }

  public async testOperation(): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async runOperation(operation: Algebra.Unnest, context: IActionContext):
  Promise<IQueryOperationResult> {
    const { expression, input, variable, position } = operation;
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);

    const output: IQueryOperationResultBindings = getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: input, context }),
    );

    // Throw if a variable has already been bound, as BIND does
    const introduced: RDF.Variable[] = position ? [ variable, position ] : [ variable ];
    const inputVariables = (await output.metadata()).variables;
    for (const bound of introduced) {
      if (inputVariables.some(innerVariable => innerVariable.variable.equals(bound))) {
        throw new Error(`Illegal binding to variable '${bound.value}' that has already been bound`);
      }
    }

    const evaluator = await this.mediatorExpressionEvaluatorFactory
      .mediate({ algExpr: expression, context });

    // Transform the stream by replacing each Bindings with one per member of the sequence
    const transform = async(bindings: Bindings, next: any, push: (pushBindings: Bindings) => void): Promise<void> => {
      try {
        const result = await evaluator.evaluate(bindings);
        if (result.termType === 'Sequence') {
          for (const [ index, member ] of result.elements.entries()) {
            let extended = bindings.set(variable, member);
            if (position) {
              extended = extended
                .set(position, dataFactory.literal(String(index + 1), dataFactory.namedNode(XSD_INTEGER)));
            }
            push(extended);
          }
        }
      } catch (error: unknown) {
        // An expression error (an unbound variable, an index out of range) yields no solution, silently
        if (!isExpressionError(<Error> error)) {
          bindingsStream.emit('error', error);
        }
      }
      next();
    };

    // eslint-disable-next-line ts/no-misused-promises
    const bindingsStream = output.bindingsStream.transform<Bindings>({ autoStart: false, transform });
    return {
      type: 'bindings',
      bindingsStream,
      async metadata() {
        const outputMetadata = await output.metadata();
        return {
          ...outputMetadata,
          // The number of members is unknown until the sequences are seen
          cardinality: { type: 'estimate', value: outputMetadata.cardinality.value },
          variables: [
            ...outputMetadata.variables,
            ...introduced.map(bound => ({ variable: bound, canBeUndef: false })),
          ],
        };
      },
    };
  }
}

export interface IActorQueryOperationUnnestArgs extends IActorQueryOperationTypedMediatedArgs {
  mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
}
