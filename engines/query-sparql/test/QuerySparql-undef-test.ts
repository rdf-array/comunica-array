/** @jest-environment setup-polly-jest/jest-environment-node */

// rdf-undef: docs/rdf-undef.md §3 row by row, over a serialized source and an RDF/JS store.
// rdf-tests-contrib's undef-* tests (yarn spec:rdf-array) hold the same expectations in the shared manifests.
import type { QueryBindings, QueryStringContext } from '@comunica/types';
import type { Bindings } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { Parser } from 'n3';
import { DataFactory } from 'rdf-data-factory';
import { RdfStore } from 'rdf-stores';
import { termToString } from 'rdf-string';
import { QueryEngine } from '../lib/QueryEngine';
import 'jest-rdf';

const DF = new DataFactory();
const PREFIX = 'PREFIX : <http://example/>\n';
const DATA = `${PREFIX}:x :p (1 undef 3) .\n:y :p (1 2 3) .\n:z :p (undef undef) .\n:v :w 5 .\n`;

describe('System test: QuerySparql over empty slots', () => {
  const engine = new QueryEngine();

  const store = RdfStore.createDefault();
  for (const quad of new Parser().parse(DATA)) {
    store.addQuad(<RDF.Quad> <unknown> quad);
  }
  const sources: [string, QueryStringContext['sources'][number]][] = [
    [ 'a serialized source', <any> { type: 'serialized', value: DATA, mediaType: 'text/turtle' } ],
    [ 'an RDF/JS store', <any> store ],
  ];

  describe.each(sources)('over %s', (_, source) => {
    const context = (): QueryStringContext => <any> { sources: [ source ]};

    async function select(query: string): Promise<Record<string, string>[]> {
      const stream = await (<QueryBindings> await engine.query(PREFIX + query, context())).execute();
      const rows = <Bindings[]> <unknown> await arrayifyStream(<any> stream);
      return rows.map(row => Object.fromEntries([ ...row ]
        .map(([ variable, term ]) => [ variable.value, termToString(term) ])));
    }

    const i = (value: number): string => `"${value}"^^http://www.w3.org/2001/XMLSchema#integer`;
    const s = (local: string): { s: string } => ({ s: `http://example/${local}` });

    it('leaves a variable at a slot unbound', async() => {
      await expect(select('SELECT ?s ?a ?b ?c { ?s :p (?a ?b ?c) }')).resolves.toEqual(expect.arrayContaining([
        { ...s('x'), a: i(1), c: i(3) },
        { ...s('y'), a: i(1), b: i(2), c: i(3) },
      ]));
    });

    it('lets undef match only a slot, and a constant no slot', async() => {
      await expect(select('SELECT ?s { ?s :p (?a undef ?c) }')).resolves.toEqual([ s('x') ]);
      await expect(select('SELECT ?s { ?s :p (1 undef 3) }')).resolves.toEqual([ s('x') ]);
      await expect(select('SELECT ?s { ?s :p (1 2 3) }')).resolves.toEqual([ s('y') ]);
      await expect(select('SELECT ?s { ?s :p (1 2 ?c) }')).resolves.toEqual([ s('y') ]);
      await expect(select('SELECT ?a { :x :p (?a ?b) }')).resolves.toEqual([]);
    });

    it.each([
      [ 'triple patterns, bound first', 'SELECT ?s ?b { :v :w ?b . ?s :p (?a ?b ?c) }' ],
      [ 'triple patterns, bound after', 'SELECT ?s ?b { ?s :p (?a ?b ?c) . :v :w ?b }' ],
      [ 'VALUES before', 'SELECT ?s ?b { VALUES ?b { 5 } ?s :p (?a ?b ?c) }' ],
      [ 'VALUES after', 'SELECT ?s ?b { ?s :p (?a ?b ?c) VALUES ?b { 5 } }' ],
      [ 'groups', 'SELECT ?s ?b { { :v :w ?b } { ?s :p (?a ?b ?c) } }' ],
      [ 'BIND', 'SELECT ?s ?b { BIND(5 AS ?b) ?s :p (?a ?b ?c) }' ],
    ])('joins a bound variable through a slot: %s', async(__, query) => {
      await expect(select(query)).resolves.toEqual([{ ...s('x'), b: i(5) }]);
    });

    it('checks a bound variable at a value, against each join order', async() => {
      await expect(select('SELECT ?s { VALUES ?b { 2 } ?s :p (?a ?b ?c) } ORDER BY ?s'))
        .resolves.toEqual([ s('x'), s('y') ]);
      await expect(select('SELECT ?s ?b { ?s :p (?a ?b ?c) OPTIONAL { :v :w ?b } } ORDER BY ?s'))
        .resolves.toEqual([{ ...s('x'), b: i(5) }, { ...s('y'), b: i(2) }]);
    });

    it('joins through a slot in EXISTS, as a compatible variable and not a written constant', async() => {
      await expect(select('SELECT ?s { :v :w ?b . ?s :p ?o FILTER EXISTS { ?s :p (?a ?b ?c) } }'))
        .resolves.toEqual([ s('x') ]);
      await expect(select('SELECT ?s { VALUES ?b { 7 } ?s :p ?o FILTER NOT EXISTS { ?s :p (?a ?b ?c) } } ORDER BY ?s'))
        .resolves.toEqual([ s('y'), s('z') ]);
    });

    it('goes through a gap, keeping slots in a named one', async() => {
      await expect(select('SELECT ?m { :x :p ( ... ?m ... ) }'))
        .resolves.toEqual(expect.arrayContaining([{ m: i(1) }, {}, { m: i(3) }]));
      await expect(select('SELECT ?h ?t { :x :p ( ?h ...?t ) }'))
        .resolves.toEqual([{ h: i(1), t: `(undef ${i(3)})` }]);
    });

    it('filters on a variable at a slot', async() => {
      await expect(select('SELECT ?s { ?s :p (?a ?b ?c) FILTER(!BOUND(?b)) }')).resolves.toEqual([ s('x') ]);
      await expect(select('SELECT ?s { ?s :p (?a ?b ?c) FILTER(?b = 2) }')).resolves.toEqual([ s('y') ]);
      await expect(select('SELECT ?s { ?s :p (?a ?b ?c) FILTER(sameTerm(?b, 2)) }')).resolves.toEqual([ s('y') ]);
    });

    it('gives a solution at a slot in UNNEST', async() => {
      await expect(select('SELECT ?m ?i { :x :p ?s UNNEST(?s AS ?m AT ?i) } ORDER BY ?i')).resolves.toEqual([
        { m: i(1), i: i(1) },
        { i: i(2) },
        { m: i(3), i: i(3) },
      ]);
      await expect(select('SELECT ?i { :x :p ?s UNNEST(?s AS ?m AT ?i) FILTER(BOUND(?m)) } ORDER BY ?i'))
        .resolves.toEqual([{ i: i(1) }, { i: i(3) }]);
    });

    it('evaluates the expressions as a hole', async() => {
      await expect(select(`SELECT ?one ?two ?d ?n ?t {
        :x :p ?s BIND(?s[1] AS ?one) BIND(?s[2] AS ?two) BIND(COALESCE(?s[2], "none") AS ?d)
        BIND(SEQLEN(?s) AS ?n) BIND(?s[2...3] AS ?t) }`)).resolves.toEqual([{
        one: i(1),
        d: '"none"',
        n: i(3),
        t: `(undef ${i(3)})`,
      }]);
      await expect(select('SELECT ?s { :x :p ?v BIND(:x AS ?s) FILTER(3 IN ?v) }')).resolves.toHaveLength(1);
      await expect(select('SELECT ?s { :x :p ?v BIND(:x AS ?s) FILTER(2 IN ?v) }')).resolves.toHaveLength(0);
      await expect(select('SELECT ?s { ?s :p ?v FILTER(?v = SEQ(1, undef, 3)) }')).resolves.toEqual([ s('x') ]);
      await expect(select('SELECT ?s { :x :p ?v BIND(:x AS ?s) FILTER(?v = SEQ(1, 2, 3)) }')).resolves.toHaveLength(0);
    });

    it('writes a slot from SEQ of an unbound variable, and keeps any other error', async() => {
      await expect(select('SELECT ?v { :x :p (?a ?b ?c) BIND(SEQ(?c, ?b, ?a) AS ?v) }'))
        .resolves.toEqual([{ v: `(${i(3)} undef ${i(1)})` }]);
      await expect(select('SELECT ?v { BIND(SEQ(1, 1/0) AS ?v) }')).resolves.toEqual([{}]);
    });

    it('orders a slot before every term', async() => {
      await expect(select('SELECT ?s { ?s :p ?v } ORDER BY ?v')).resolves.toEqual([ s('z'), s('x'), s('y') ]);
    });

    it('writes a slot in a template, and still drops a triple for an unbound top-level variable', async() => {
      const quads = await arrayifyStream(await (<any> await engine
        .query(`${PREFIX}CONSTRUCT { ?s :q (?c ?b ?a) ; :r ?b } WHERE { ?s :p (?a ?b ?c) }`, context())).execute());
      const object = (subject: string, predicate: string): RDF.Term | undefined => quads
        .find((quad: RDF.Quad) => quad.subject.value === `http://example/${subject}` &&
          quad.predicate.value === `http://example/${predicate}`)?.object;
      const n = (value: number): RDF.Literal =>
        DF.literal(String(value), DF.namedNode('http://www.w3.org/2001/XMLSchema#integer'));
      expect(object('x', 'q')).toEqualRdfTerm(DF.sequence([ n(3), DF.undef(), n(1) ]));
      expect(object('y', 'q')).toEqualRdfTerm(DF.sequence([ n(3), n(2), n(1) ]));
      expect(object('x', 'r')).toBeUndefined();
      expect(object('y', 'r')).toEqualRdfTerm(n(2));
    });
  });

  describe('results', () => {
    const context: any = { sources: [{ type: 'serialized', value: DATA, mediaType: 'text/turtle' }]};
    const query = `${PREFIX}SELECT ?v { :x :p ?v }`;

    async function write(mediaType: string): Promise<string> {
      const { data } = await engine.resultToString(await engine.query(query, context), mediaType);
      let text = '';
      for await (const chunk of data) {
        text += String(chunk);
      }
      return text;
    }

    it('writes a slot in the formats', async() => {
      await expect(write('application/sparql-results+json')).resolves.toContain('{"type":"undef"}');
      await expect(write('application/sparql-results+xml')).resolves.toContain('<unbound');
      await expect(write('text/csv')).resolves.toContain('undef');
      await expect(write('text/tab-separated-values')).resolves.toContain('undef');
    });
  });
});
