import { ActorFunctionFactoryExpressionSeq } from '@comunica/actor-function-factory-expression-seq';
import {
  runFuncTestTable,
  numeric,
  Notation,
} from '@comunica/utils-jest';
import { ActorFunctionFactoryTermSeqLen } from '../lib';

describe('like \'SEQLEN\' receiving', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermSeqLen(args),
      args => new ActorFunctionFactoryExpressionSeq(args),
    ],
    arity: 1,
    aliases: numeric,
    notation: Notation.Function,
    operation: 'SEQLEN',
    testTable: `
        SEQ() = 0i
        SEQ(1) = 1i
        SEQ(1,"a",<http://example.com>) = 3i
        SEQ(SEQ(1,2),SEQ()) = 2i
      `,
    errorTable: `
        1 = 'Argument types not valid for operator'
        "no-sequence" = 'Argument types not valid for operator'
        ?unbound = 'Unbound variable'
      `,
  });
});
