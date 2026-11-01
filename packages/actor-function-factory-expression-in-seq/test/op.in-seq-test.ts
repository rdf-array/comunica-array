import { ActorFunctionFactoryExpressionSeq } from '@comunica/actor-function-factory-expression-seq';
import { ActorFunctionFactoryTermEquality } from '@comunica/actor-function-factory-term-equality';
import { ActorFunctionFactoryTermSeqIndex } from '@comunica/actor-function-factory-term-seq-index';
import {
  runFuncTestTable,
  bool,
  merge,
  numeric,
  Notation,
} from '@comunica/utils-jest';
import { ActorFunctionFactoryExpressionInSeq } from '../lib';

describe('evaluations of \'IN ?seq\' and \'NOT IN ?seq\' (rdf-array)', () => {
  const registeredActors = [
    (args: any) => new ActorFunctionFactoryExpressionInSeq(args),
    (args: any) => new ActorFunctionFactoryTermEquality(args),
    (args: any) => new ActorFunctionFactoryExpressionSeq(args),
    (args: any) => new ActorFunctionFactoryTermSeqIndex(args),
  ];

  runFuncTestTable({
    registeredActors,
    operation: 'IN',
    arity: 2,
    notation: Notation.Infix,
    aliases: merge(numeric, bool),
    testTable: `
      1 SEQ(2,1,3) = true
      1 SEQ(2,1.0,3) = true
      1 SEQ(2,3) = false
      1 SEQ() = false
      SEQ(3,4) SEQ(SEQ(0,0),SEQ(3,0),SEQ(3,4)) = true
      SEQ(3,4) SEQ(SEQ(0,0),SEQ(3,0)) = false
      1 SEQ(SEQ(1,2),3)[1] = true
      1 SEQ("a",1) = true
    `,
    errorTable: `
      1 SEQ(?a,2) = 'Unbound variable'
      1 SEQ("a") = 'Some argument to IN errorred and none where equal.'
      1 SEQ(1,2)[1] = 'Argument types not valid for operator'
      1 ?a = 'Unbound variable'
    `,
  });

  runFuncTestTable({
    registeredActors,
    operation: 'NOT IN',
    arity: 2,
    notation: Notation.Infix,
    aliases: merge(numeric, bool),
    testTable: `
      1 SEQ(2,1,3) = false
      1 SEQ(2,1.0,3) = false
      1 SEQ(2,3) = true
      1 SEQ() = true
      SEQ(3,4) SEQ(SEQ(0,0),SEQ(3,0)) = true
    `,
    errorTable: `
      1 SEQ(?a,2) = 'Unbound variable'
      1 SEQ("a") = 'Some argument to IN errorred and none where equal.'
      1 SEQ(1,2)[1] = 'Argument types not valid for operator'
    `,
  });
});
