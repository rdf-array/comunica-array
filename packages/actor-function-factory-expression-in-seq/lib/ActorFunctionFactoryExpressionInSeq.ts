import type {
  IActionFunctionFactory,
  IActorFunctionFactoryArgs,
  IActorFunctionFactoryOutput,
  IActorFunctionFactoryOutputTerm,
  IExpressionFunction,
  MediatorFunctionFactory,
  MediatorFunctionFactoryUnsafe,
} from '@comunica/bus-function-factory';
import {
  ActorFunctionFactoryDedicated,
} from '@comunica/bus-function-factory';
import { SparqlOperator } from '@comunica/utils-expression-evaluator';
import { ExpressionFunctionInSeq } from './ExpressionFunctionInSeq';

interface IActorFunctionFactoryExpressionInSeqArgs extends IActorFunctionFactoryArgs {
  mediatorFunctionFactory: MediatorFunctionFactoryUnsafe;
}

/**
 * A comunica ExpressionFunctionInSeq Function Factory Actor (rdf-array): `?x IN ?seq` and `?x NOT IN ?seq`.
 */
export class ActorFunctionFactoryExpressionInSeq extends ActorFunctionFactoryDedicated {
  private readonly mediatorFunctionFactory: MediatorFunctionFactory;

  public constructor(args: IActorFunctionFactoryExpressionInSeqArgs) {
    super({
      ...args,
      functionNames: [ SparqlOperator.IN_SEQ, SparqlOperator.NOT_IN_SEQ ],
      termFunction: false,
    });
    this.mediatorFunctionFactory = <MediatorFunctionFactory> args.mediatorFunctionFactory;
  }

  public async run<T extends IActionFunctionFactory>(args: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    const equalityFunction = await this.mediatorFunctionFactory.mediate({
      functionName: SparqlOperator.EQUAL,
      requireTermExpression: true,
      context: args.context,
      arguments: args.arguments,
    });

    return <T extends { requireTermExpression: true } ?
      IActorFunctionFactoryOutputTerm :
      IActorFunctionFactoryOutput>
      <IExpressionFunction> new ExpressionFunctionInSeq(
        equalityFunction,
        args.functionName === SparqlOperator.NOT_IN_SEQ,
      );
  }
}
