# comunica-array: SPARQL over rdf-array (sequences as terms)

rdf-array is RDF whose data model has a fifth kind of term, the **sequence**: `(1 2 3)` in Turtle-array
is one term holding its elements in order, not a ladder of `rdf:first`/`rdf:rest` blank nodes,
and `()` is the empty sequence, not `rdf:nil`. Triples that spell out `rdf:first`/`rdf:rest`
stay ordinary triples and `rdf:nil` an ordinary IRI; they are just no longer what `( … )` means.
This fork of Comunica is the JavaScript SPARQL engine for that model; its stack is

| role | fork (branch `rdf-sequences`) | of |
|---|---|---|
| RDF/JS types, `Sequence` in `Term`, `Quad_Subject`, `Quad_Object` | [types-array](https://github.com/rdf-array/types-array) | [rdfjs/types](https://github.com/rdfjs/types) 2.0.1 |
| data factory, `DataFactory.sequence()` | [rdf-data-factory-array](https://github.com/rdf-array/rdf-data-factory-array) | [rubensworks/rdf-data-factory.js](https://github.com/rubensworks/rdf-data-factory.js) 2.1.0 |
| term ↔ string, `(e1 e2 …)` | [rdf-string-array](https://github.com/rdf-array/rdf-string-array), [rdf-string-ttl-array](https://github.com/rdf-array/rdf-string-ttl-array) | rdf-string.js 2.0.1, rdf-string-ttl.js 2.0.1 |
| nested-term helpers and pattern matching | [rdf-terms-array](https://github.com/rdf-array/rdf-terms-array) | rdf-terms.js 2.0.0 |
| Turtle, TriG, N-Triples, N-Quads, N3; `Sequence.value` spelled `(e1 e2 …)` | [N3.js-array](https://github.com/rdf-array/N3.js-array) | rdfjs/N3.js |
| JSON-LD, `@list` ↔ sequence | [jsonld-streaming-parser-array](https://github.com/rdf-array/jsonld-streaming-parser-array), [jsonld-streaming-serializer-array](https://github.com/rdf-array/jsonld-streaming-serializer-array) | streaming-jsonld-parser.js 5.0.0, jsonld-streaming-serializer.js 4.0.0 |
| RDF/XML, `rdf:parseType="Collection"` → sequence | [rdfxml-streaming-parser-array](https://github.com/rdf-array/rdfxml-streaming-parser-array) | rdfjs/rdfxml-streaming-parser.js 3.2.0 |
| results of a remote SPARQL endpoint, `{"type": "seq"}` and `<seq>` → sequence | [sparqljson-parse-array](https://github.com/rdf-array/sparqljson-parse-array), [sparqlxml-parse-array](https://github.com/rdf-array/sparqlxml-parse-array) | sparqljson-parse.js 3.3.0, sparqlxml-parse.js 3.3.0 |
| SPARQL parser, generator, algebra | [traqula-array](https://github.com/rdf-array/traqula-array) | [comunica/traqula](https://github.com/comunica/traqula) v1.4.0 |
| query engine | this repository | [comunica/comunica](https://github.com/comunica/comunica) master (5.4.0) |

The same treatment of other implementations: [jena-array](https://github.com/rdf-array/jena-array)
(Java), [shex.js-array](https://github.com/rdf-array/shex.js-array) (ShEx in JavaScript, which
shares N3.js-array and types-array) and [PyShEx-array](https://github.com/rdf-array/PyShEx-array)
with [rdflib-array](https://github.com/rdf-array/rdflib-array) (Python).

## Setting up

`package.json`'s `resolutions` pin the forks to their `rdf-sequences` branches on GitHub (their
compiled output is committed, because yarn 1 runs no `prepare` script for a git dependency) and
link the Traqula packages to a checkout beside this one:

```bash
git clone git@github.com:rdf-array/traqula-array.git
git clone git@github.com:rdf-array/comunica-array.git
(cd traqula-array && yarn install)     # builds it
(cd comunica-array && yarn install)    # links ../traqula-array, builds the engines
```

After a fork gains commits, `yarn upgrade <package>` re-pins it in `yarn.lock`, but yarn 1 keeps
the installed folder when the package's version number did not change: remove
`node_modules/<package>` and run `yarn install --check-files` to get the new content.

## What a sequence does in a query

```sparql
PREFIX : <http://a.example/>
SELECT ?x ?o WHERE { ?s :p (?x (2 3) ?o) }        # binds ?x and ?o from a matching sequence
SELECT ?s WHERE { ?s :p () }                         # the empty sequence is a term
CONSTRUCT { ?s :r (?x 9) } WHERE { ?s :p (?x 2) }   # builds sequences
SELECT ?o WHERE { ?s :p ?o FILTER(?o = SEQ(1, 2)) }  # compared whole, like any term
SELECT * WHERE { ?s ?p ?o } ORDER BY ?o              # sequences after literals, element by element
SELECT ?v WHERE { ?s :p ( ... ( "code" ?v ) ... ) }  # a gap `...` matches any run of members
SELECT ?h ?t WHERE { ?s :p ( ?h ...?t ) }            # a named gap binds the run it matched
SELECT ?x ?i WHERE { ?s :p ?o UNNEST(?o AS ?x AT ?i) }  # one solution per member, with its position
SELECT ?y WHERE { ?s :p ?o BIND(?o[2][1...3] AS ?y) }   # index and slice, 1-based, both ends included
SELECT ?s WHERE { ?s :p ?o FILTER(SEQ(3, 4) IN ?o && isSEQ(?o) && SEQLEN(?o) > 1) }
```

The last five lines are the SPARQL-array syntax of
[array-syntax.md](https://rdf-array.github.io/rdf-array/docs/array-syntax.html), parsed by
traqula-array and evaluated here:

- **Gaps.** In a WHERE clause a sequence pattern may hold `...`, which matches zero or more
  members, and the named gap `...?rest` (one token, no space), which also binds `?rest` to the
  run it matched, as a sequence. A pattern may hold several gaps, gaps may nest, and the same
  variable twice must match equal values, named gaps included. The algebra spells a gap as a
  variable named `...` or `...rest` (`isGapVariable`, `gapVariableName` in `@comunica/utils-algebra`),
  since the data model has no term for one; `bus-query-source-identify`'s `getVariables` turns a
  named gap into its variable and drops an unnamed one, and `quadsToBindings` matches a pattern
  with gaps as a whole (`matchPatternGaps`), yielding one binding per way the quad matches. Such a
  pattern goes to a store's `match` with the sequence position left open and is matched
  afterwards, as a sequence holding variables already was. A bind join that reaches a named gap
  whose variable is already bound to a sequence splices that sequence's members into the pattern
  (`materializeTerm`). Templates and `INSERT`/`DELETE DATA` have no gaps.
- **UNNEST.** `UNNEST(expr AS ?x AT ?i)` is the algebra operation `unnest` (`input`, `expression`,
  `variable`, `position?`), evaluated by `@comunica/actor-query-operation-unnest` beside the
  `extend` actor of BIND: for each solution, one solution per member of the sequence `expr`
  evaluates to, with `?i` the 1-based position; a solution whose expression is unbound, errors or
  is not a sequence yields nothing. Like BIND, UNNEST may not rebind a variable in scope (the parser
  refuses it). Its cardinality is reported as an estimate.
- **Functions.** `expr[i]` (operator `index`, `@comunica/actor-function-factory-term-seq-index`): the
  i-th member, 1-based; an index that is out of range or not a whole number is an error, so a BIND
  leaves its variable unbound. `expr[m...n]` and `expr[m...]` (`slice`, `-term-seq-slice`; `[...n]` is
  read as `[1...n]`): both ends included and clamped to the sequence, `(4 5)[2...3]` is `(5)`; a
  start below 1 or an end below 0 is an error. `SEQLEN(e)` (`seqlen`, `-term-seq-len`) is the number
  of members, an error on anything but a sequence; `isSEQ(e)` (`isseq`, `-term-is-seq`); `SEQ(…)`
  (`seq`, `-expression-seq`) builds a sequence of its arguments' values, `SEQ()` the empty one;
  `?x IN ?seq` and `?x NOT IN ?seq` (`inseq`, `notinseq`, `-expression-in-seq`; the right-hand side a
  variable, a `SEQ(…)` call or an index of one) test membership under `=`, erroring, like `IN ( … )`,
  only when no member is equal and a comparison errored. `=` and `!=` compare sequences member by
  member as before.

- A collection in a triple pattern (or CONSTRUCT template, INSERT/DELETE data) is one sequence
  term. A variable inside it is bound from the corresponding element of a matching sequence, nested
  sequences included, and a repeated variable must match equal elements: the RDF/JS source matches
  such a pattern as it matches a quoted triple holding variables (fetch the quads with the sequence
  position left open, then `matchPatternMappings`) and keeps it away from a store's `matchBindings`
  and quoted-triple index, which do not know sequences: `rdf-stores`, which backs every `serialized`
  source, otherwise returned nothing for it. A blank node property list inside a collection,
  `( [ :p 1 ] )`, still contributes its triples and is represented in the sequence by its (blank
  node, hence variable) identifier. A lone collection in a group, `{ ( ?x ) }`, is a term with
  nothing to attach to, so the group is the empty BGP.
- In expressions a sequence is a term of its own kind: `isIRI`, `isBlank`, `isLiteral` and
  `isTriple` are false for it, `=` and `!=` compare whole sequences, `<` orders sequences after
  quoted triples, element by element with a shorter prefix first, and `STR()` spells `(e1 e2 …)`.
  `DISTINCT`, `REDUCED`, `GROUP BY` and hash joins key on the `rdf-string` spelling.
- Results: SPARQL JSON `{"type": "seq", "value": [ …elements… ]}` (jena-array's spelling), SPARQL
  XML `<seq>…</seq>` with one child per element, CSV `("1" http://a.example/o (…))` quoted once as
  a cell, TSV the Turtle spelling; the `simple`, `table`, `tree` and `json` writers use the
  `rdf-string` spelling. CONSTRUCT results go through N3.js-array for Turtle, TriG, N-Triples and
  N-Quads.
- Sources and formats: a JSON-LD `@list` (and the values of a `@container: @list` property) is
  one sequence, nested lists are nested sequences, and a value that converts to no RDF term is
  skipped; a sequence in a CONSTRUCT result is serialized to JSON-LD as `@list` (a sequence cannot
  be a subject, having no `@id`). RDF/XML `rdf:parseType="Collection"` is one sequence, `()` when
  empty, and `rdf:li` is no longer numbered into the container membership properties `rdf:_1`,
  `rdf:_2`, …. A remote SPARQL endpoint's `{"type": "seq"}` (JSON) or `<seq>` (XML) bindings are
  read back as sequences; the query sent to an endpoint spells a sequence `( … )`, which only an
  rdf-array endpoint such as jena-array's reads as one.
- Skolemisation, deskolemisation and binding materialisation descend into sequences; the QPF
  source does not send a sequence holding variables as a term.

## What changed in this repository

- `@comunica/types`: `TermType` gains `'sequence'`.
- `@comunica/utils-expression-evaluator`: the `Sequence` expression term, `TermTransformer`,
  `asTermType`.
- `@comunica/actor-function-factory-term-lesser-than` and
  `@comunica/actor-term-comparator-factory-expression-evaluator`: sequence ordering.
- `@comunica/utils-iterator`'s `compareTerms`: sequences between quoted triples and variables.
- `@comunica/actor-query-result-serialize-sparql-json`, `-xml`, `-csv`: the spellings above.
- `@comunica/actor-query-source-identify-rdfjs`, `@comunica/bus-query-source-identify` (`Utils`,
  with `NestedTermKey` paths), `@comunica/utils-query-operation` (`materializeTerm`),
  `@comunica/actor-optimize-query-operation-query-source-skolemize`,
  `@comunica/actor-query-source-identify-hypermedia-qpf`: sequences treated like quoted triples
  wherever those recurse.
- New: `@comunica/actor-query-operation-unnest`, `@comunica/actor-function-factory-term-seq-index`,
  `-term-seq-slice`, `-term-seq-len`, `-term-is-seq`, `-expression-seq` and `-expression-in-seq`,
  wired into `config-query-sparql` (`query-operation/actors*.json`, `function-factory/actors.json`)
  and the dependencies of the `query-sparql`, `query-sparql-rdfjs`, `query-sparql-rdfjs-lite` and
  `expressions-sparql` engines; `SparqlOperator` gains `SEQ`, `SEQLEN`, `IS_SEQ`, `SEQ_INDEX`,
  `SEQ_SLICE`, `IN_SEQ` and `NOT_IN_SEQ`; `@comunica/utils-algebra` the `Unnest` operation and the
  gap-variable helpers; `bus-query-source-identify`'s `Utils` the gap matcher; `utils-query-operation`'s
  `materializeTerm` the named-gap splice.
- `@comunica/actor-rdf-parse-jsonld`, `@comunica/actor-rdf-serialize-jsonld` and
  `@comunica/actor-rdf-parse-rdfxml` depend on the parser and serializer forks (their own code is
  unchanged); the root `resolutions` reach `sparqljson-parse` and `sparqlxml-parse` under
  `fetch-sparql-endpoint`, and `n3` under everything. The JSON-LD *parser* fork is deliberately
  not a root resolution: Components.js, which assembles the engine from the JSON-LD configuration
  files (`config/`, the generated `components/`), reads `constructorArguments` as an
  `rdf:first`/`rdf:rest` list through `rdf-object` and `rdf-parse`, so those files stay RDF 1.1
  JSON-LD, parsed by the vanilla `jsonld-streaming-parser` nested under `rdf-parse`, while JSON-LD
  query sources go through the fork.
- No code in Comunica itself handled `rdf:first`/`rdf:rest` ladders or the `rdf:Seq`/`rdf:Bag`/
  `rdf:Alt` containers; the ladder construction that Traqula's grammar did is removed in
  traqula-array, with `CommonIRIs.FIRST`, `REST` and `NIL`.

## Tests

New (SPARQL-array syntax): the tests of the seven new packages (`op.*-test.ts`,
`ActorQueryOperationUnnest-test.ts`), the gap cases of `bus-query-source-identify/test/Utils-test.ts`,
`actor-query-source-identify-rdfjs/test/QuerySourceRdfJs-test.ts` and
`utils-query-operation/test/MaterializeBindings-test.ts`, and in
`engines/query-sparql/test/QuerySparql-test.ts` the thirteen examples of array-syntax.md §4.1 with their
result rows, plus a join of a named gap with a variable bound elsewhere.

New: sequence cases in `utils-iterator/test/termOrder-test.ts`,
`utils-expression-evaluator/test/unit/expressions/Term-test.ts`, the SPARQL JSON, XML and CSV
serializer tests, `bus-query-source-identify/test/Utils-test.ts` (nested and repeated variables
inside sequence patterns), `actor-function-factory-term-lesser-than/test/unit.op.lesserThan-test.ts`,
`actor-query-source-identify-rdfjs/test/QuerySourceRdfJs-test.ts` (`hasSequenceWithVariables`,
`nullifyVariables`, sequence patterns against an `rdf-stores` store), and in
`engines/query-sparql/test/QuerySparql-test.ts` the rdf-array counterparts of the skipped system tests
plus "sequences in JSON-LD and RDF/XML sources (rdf-array)": binding the elements of a JSON-LD `@list`
and of an RDF/XML Collection, and serializing a constructed sequence as `@list`.

Flagged, with the reason in the test file: the four `QuerySparql` system tests "should handle
zero-or-more paths with lists" (and "… after a link" for the three stores), which walk
`rdf:rest*/rdf:first` over FHIR data written `fhir:coding ( [ … ] )`; under rdf-array that collection is
one sequence term and the ladder path matches nothing. Their rdf-array counterparts query the sequence
directly, `fhir:coding ( [ a … ] )`.

`yarn test` (the unit tests, 7500+) passes with those skipped; `ExpressionEngine-test`'s
"honours the provided context" compares `NOW()` against a UTC string and fails on a machine
whose time zone is not UTC (run it with `TZ=UTC`), which is unrelated to rdf-array. The W3C SPARQL
test suite (`yarn test:spec`, which needs the network) was not run; its collection-based
tests (lists in data or queries) would need an rdf-array reading. traqula-array's `yarn spec:all`
(the SPARQL syntax suites) passes 642 of 647; the five failures concern a trailing `VALUES`
with `GROUP BY` and predate the fork.

The shared SPARQL-array tests of [rdf-tests-contrib](https://github.com/rdf-array/rdf-tests-contrib)
run with `yarn spec:rdf-array` in `engines/query-sparql`: `spec/fetch-rdf-tests-contrib.sh`
clones the suite into `.rdf-array-tests/` (gitignored), or links a local checkout there when
`RDF_TESTS_CONTRIB=../rdf-tests-contrib` is set, and the `spec:rdf-array-*` scripts map its Pages URLs
there (`-m`; fetched through the HTTP cache, the result files arrived gzipped and were dropped). The
runner is [rdf-test-suite-array](https://github.com/rdf-array/rdf-test-suite-array), the root
`rdf-test-suite` devDependency, which reads expected results holding sequences that stock
rdf-test-suite silently skipped. With the suite rewritten to the SPARQL-array syntax
(rdf-tests-contrib eee4e34) nothing is skipped any more: eval 37, update 3, syntax 49 and results 4
pass, the gap, UNNEST, function and position tests included. Running the earlier suite found that
traqula refused a sequence in `DELETE DATA` as if it were blank nodes (fixed in traqula-array).

## Not done

- RDFa (`rdfa-streaming-parser`): `inlist` still builds a ladder.
- Components.js and `rdf-object` read the engine's configuration lists as ladders (see above); a
  sequence-aware `Resource.list` would let the configuration files be rdf-array too.
- The W3C suites of the parser forks (`yarn spec` in jsonld-streaming-parser-array and
  rdfxml-streaming-parser-array) fail their list and collection tests by design, as their expected
  output spells ladders. A JSON-LD list value that converts to no RDF term is skipped where JSON-LD
  1.1 left a list node without `rdf:first`.
- QPF / TPF sources cannot express a sequence term in a fragment URL.
- A sequence cannot be built from solutions (no `COLLECT` aggregate), and `?s[-1]` does not
  count from the end; both are open in array-syntax.md §6. `=` compares the members of two
  sequences as terms, so `SEQ(1, 2) = SEQ(1, 2.0)` is false where `1 = 2.0`'s members would be
  equal by value. A named gap whose variable a bind join has bound to something other than a
  sequence is left in the pattern; the join then drops the conflicting solutions.
- The optimizers that read variables straight off patterns (filter pushdown and the like) see a gap
  variable as a variable named `...`, which only keeps them from pushing a filter on the gap's
  variable down.
- `rdf-isomorphic` (used by tests) does not canonicalize blank nodes inside sequences, and
  `rdf-stores`' quoted-triple index and `matchBindings` do not know sequences; the RDF/JS source
  post-filters sequence patterns instead.
