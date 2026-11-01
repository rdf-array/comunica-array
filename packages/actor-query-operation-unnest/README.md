# Comunica Unnest Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-operation-unnest.svg)](https://www.npmjs.com/package/@comunica/actor-query-operation-unnest)

A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that handles the SPARQL-array `UNNEST(expr AS ?x AT ?i)` operation of
[rdf-array](https://rdf-array.github.io/rdf-array/docs/array-syntax.html): one solution per member of the sequence that `expr` evaluates to, binding `?x` to the member and `?i` to its position, counting from 1. A solution whose expression is unbound or not a sequence yields no solution.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-operation-unnest
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-operation-unnest/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-operation/actors#unnest",
      "@type": "ActorQueryOperationUnnest",
      "mediatorQueryOperation": { "@id": "urn:comunica:default:query-operation/mediators#main" },
      "mediatorExpressionEvaluatorFactory": { "@id": "urn:comunica:default:expression-evaluator-factory/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorQueryOperation`: A mediator over the [Query Operation bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation).
* `mediatorExpressionEvaluatorFactory`: A mediator over the [Expression Evaluator Factory bus](https://github.com/comunica/comunica/tree/master/packages/bus-expression-evaluator-factory).
