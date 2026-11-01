import { ActorFunctionFactoryExpressionSeq } from '@comunica/actor-function-factory-expression-seq';
import {
  runFuncTestTable,
  bool,
  Notation,
} from '@comunica/utils-jest';
import { ActorFunctionFactoryTermIsSeq } from '../lib';

describe('like \'isSEQ\' receiving', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermIsSeq(args),
      args => new ActorFunctionFactoryExpressionSeq(args),
    ],
    arity: 1,
    aliases: bool,
    notation: Notation.Function,
    operation: 'isSEQ',
    testTable: `
        SEQ() = true
        SEQ(1,"a") = true
        SEQ(SEQ()) = true
        1 = false
        "foo" = false
        <http://example.com> = false
      `,
  });
});
