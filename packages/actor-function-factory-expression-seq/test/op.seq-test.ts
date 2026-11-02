import { ActorFunctionFactoryTermDivision } from '@comunica/actor-function-factory-term-division';
import { ActorFunctionFactoryTermEquality } from '@comunica/actor-function-factory-term-equality';
import { ActorFunctionFactoryTermSeqLen } from '@comunica/actor-function-factory-term-seq-len';
import {
  runFuncTestTable,
  bool,
  merge,
  numeric,
  Notation,
} from '@comunica/utils-jest';
import { ActorFunctionFactoryExpressionSeq } from '../lib';

describe('like \'SEQ\' receiving', () => {
  // The result of SEQ is inspected through SEQLEN and compared through =, as the test tables hold terms
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryExpressionSeq(args),
      args => new ActorFunctionFactoryTermSeqLen(args),
      args => new ActorFunctionFactoryTermDivision(args),
    ],
    arity: 'vary',
    aliases: numeric,
    notation: Notation.Function,
    operation: 'SEQLEN',
    testTable: `
        SEQ() = 0i
        SEQ(1) = 1i
        SEQ(1,"a",<http://example.com>,SEQ()) = 4i
        SEQ(SEQ(1,2),3) = 2i
        SEQ(?unbound) = 1i
        SEQ(1,?unbound) = 2i
        SEQ(1,undef,3) = 3i
        SEQ(undef) = 1i
      `,
    errorTable: `
        SEQ(1,1/0) = 'Integer division by 0'
      `,
  });

  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryExpressionSeq(args),
      args => new ActorFunctionFactoryTermEquality(args),
    ],
    arity: 2,
    aliases: merge(numeric, bool),
    notation: Notation.Infix,
    operation: '=',
    testTable: `
        SEQ() SEQ() = true
        SEQ(1,2) SEQ(1,2) = true
        SEQ(1,2) SEQ(2,1) = false
        SEQ(1) SEQ(1,1) = false
        SEQ(1,undef) SEQ(1,undef) = true
        SEQ(1,undef) SEQ(1,?unbound) = true
        SEQ(1,undef) SEQ(1,2) = false
        SEQ(1,undef) SEQ(undef,1) = false
        SEQ(SEQ(1,2,3),SEQ(4,5,6)) SEQ(SEQ(1,2,3),SEQ(4,5,6)) = true
      `,
  });
});
