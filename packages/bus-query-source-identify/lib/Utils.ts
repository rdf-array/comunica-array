import type { BindingsStream, ComunicaDataFactory, MetadataBindings, MetadataQuads, TermsOrder } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { gapVariableName, isGapVariable } from '@comunica/utils-algebra';
import type { BindingsFactory } from '@comunica/utils-bindings-factory';
import { ClosableIterator } from '@comunica/utils-iterator';
import { validateMetadataQuads } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { termToString } from 'rdf-string';
import type { NestedTermKey } from 'rdf-terms';
import {
  forEachTermsNested,
  getTermsNested,
  getValueNestedPath,
  matchPatternMappings,
  QUAD_TERM_NAMES,
  reduceTermsNested,
  someTerms,
  someTermsNested,
  uniqTerms,
} from 'rdf-terms';

const DF = new DataFactory();

/**
 * Convert an iterator of quads to an iterator of bindings.
 * @param quads The quads to convert.
 * @param pattern The pattern to get variables from to determine bindings.
 *                All quads are also assumed to match the pattern.
 * @param dataFactory The data factory.
 * @param bindingsFactory The factory for creating bindings.
 * @param unionDefaultGraph If union default graph mode is enabled.
 *                          If true, variable graphs will match all graphs, including the default graph.
 *                          If false, variable graphs will only match named graphs, and not the default graph.
 */
export function quadsToBindings(
  quads: AsyncIterator<RDF.Quad>,
  pattern: Algebra.Pattern,
  dataFactory: ComunicaDataFactory,
  bindingsFactory: BindingsFactory,
  unionDefaultGraph: boolean,
): BindingsStream {
  const variables = getVariables(pattern);

  // If non-default-graph triples need to be filtered out
  const filterNonDefaultQuads = pattern.graph.termType === 'Variable' && !unionDefaultGraph;

  // rdf-array: a pattern whose sequences hold gaps is matched as a whole, in all the ways its gaps allow
  const gaps = hasGaps(pattern);

  // Detect duplicate variables in the pattern
  const duplicateElementLinks: Record<string, NestedTermKey[][]> | undefined = gaps ?
    undefined :
    getDuplicateElementLinks(pattern);

  // Convenience datastructure for mapping quad elements to variables
  const elementVariables: Record<string, string> = reduceTermsNested(
    pattern,
    (acc: Record<string, string>, term: RDF.Term, keys: NestedTermKey[]) => {
      if (term.termType === 'Variable' && gapVariableName(term) === undefined) {
        acc[keys.join('_')] = term.value;
      }
      return acc;
    },
    {},
  );

  // Optionally filter, and construct bindings
  let filteredOutput = quads;

  // SPARQL query semantics allow graph variables to only match with named graphs, excluding the default graph
  // But this is not the case when using union default graph semantics
  if (filterNonDefaultQuads) {
    filteredOutput = filteredOutput.filter(quad => quad.graph.termType !== 'DefaultGraph');
  }

  // If there are duplicate variables in the search pattern,
  // make sure that we filter out the triples that don't have equal values for those triple elements,
  // as the rdf-resolve-quad-pattern bus ignores variable names.
  if (duplicateElementLinks) {
    filteredOutput = filteredOutput.filter((quad) => {
      for (const keyLeft in duplicateElementLinks) {
        const keysLeft: NestedTermKey[] = <NestedTermKey[]> keyLeft.split('_');
        const valueLeft = getValueNestedPath(quad, keysLeft);
        for (const keysRight of duplicateElementLinks[keyLeft]) {
          if (!valueLeft.equals(getValueNestedPath(quad, keysRight))) {
            return false;
          }
        }
      }
      return true;
    });
  }

  // Wrap it in a ClosableIterator, so we can propagate destroy calls
  const it = new ClosableIterator(gaps ?
    // rdf-array: one binding per way the quad matches the gaps, none when it does not
    filteredOutput.transform<RDF.Bindings>({
      autoStart: false,
      transform: (quad, done, push) => {
        for (const mapping of matchPatternGaps(quad, pattern, dataFactory)) {
          push(bindingsFactory.bindings(Object.entries(mapping)
            .map(([ name, term ]) => [ dataFactory.variable(name), term ])));
        }
        done();
      },
    }) :
    filteredOutput.map<RDF.Bindings>(quad => bindingsFactory
      .bindings(Object.keys(elementVariables).map((key) => {
        const keys: NestedTermKey[] = <any>key.split('_');
        const variable = elementVariables[key];
        const term = getValueNestedPath(quad, keys);
        return [ dataFactory.variable(variable), term ];
      }))), {
    onClose: () => quads.destroy(),
  });

  // Set the metadata property
  setMetadata(
    dataFactory,
    it,
    quads,
    elementVariables,
    variables,
    filterNonDefaultQuads || Boolean(duplicateElementLinks) || gaps,
  );

  return it;
}

/**
 * rdf-array: whether a pattern holds a gap, `...` or `...?rest`, inside a sequence.
 * @param pattern A quad pattern.
 */
export function hasGaps(pattern: RDF.BaseQuad): boolean {
  return someTermsNested(pattern, term => isGapVariable(term));
}

/**
 * rdf-array: all the ways a quad matches a pattern whose sequences may hold gaps.
 * A gap `...` matches any run of members, the named gap `...?rest` binds its variable to that run as a
 * sequence, a repeated variable (gap variables included) must match equal values, and nested sequences and
 * quoted triples are matched member by member. Without gaps there is at most one mapping.
 * @param quad A quad.
 * @param pattern A quad pattern.
 * @param dataFactory The data factory, which builds the sequences that named gaps bind.
 * @return The solution mappings, from variable name to term; empty when the quad does not match.
 */
export function matchPatternGaps(
  quad: RDF.BaseQuad,
  pattern: RDF.BaseQuad,
  dataFactory: ComunicaDataFactory,
): Record<string, RDF.Term>[] {
  return matchQuadGaps(quad, pattern, {}, dataFactory);
}

function matchQuadGaps(
  quad: RDF.BaseQuad,
  pattern: RDF.BaseQuad,
  mapping: Record<string, RDF.Term>,
  dataFactory: ComunicaDataFactory,
): Record<string, RDF.Term>[] {
  let mappings = [ mapping ];
  for (const key of QUAD_TERM_NAMES) {
    mappings = mappings.flatMap(current => matchTermGaps(pattern[key], quad[key], current, dataFactory));
  }
  return mappings;
}

function matchTermGaps(
  pattern: RDF.Term,
  term: RDF.Term,
  mapping: Record<string, RDF.Term>,
  dataFactory: ComunicaDataFactory,
): Record<string, RDF.Term>[] {
  switch (pattern.termType) {
    case 'Variable': {
      const bound = mapping[pattern.value];
      if (bound) {
        return bound.equals(term) ? [ mapping ] : [];
      }
      return [{ ...mapping, [pattern.value]: term }];
    }
    case 'Quad':
      return term.termType === 'Quad' ? matchQuadGaps(term, pattern, mapping, dataFactory) : [];
    case 'Sequence':
      return term.termType === 'Sequence' ?
        matchMembersGaps(pattern.elements, 0, term.elements, 0, mapping, dataFactory) :
          [];
    default:
      return pattern.equals(term) ? [ mapping ] : [];
  }
}

function matchMembersGaps(
  patterns: readonly RDF.Term[],
  patternIndex: number,
  terms: readonly RDF.Term[],
  termIndex: number,
  mapping: Record<string, RDF.Term>,
  dataFactory: ComunicaDataFactory,
): Record<string, RDF.Term>[] {
  if (patternIndex === patterns.length) {
    return termIndex === terms.length ? [ mapping ] : [];
  }
  const member = patterns[patternIndex];
  const gapName = gapVariableName(member);
  if (gapName !== undefined) {
    // The gap takes every run from here on, the longest included; a named gap binds its variable to the run
    const mappings: Record<string, RDF.Term>[] = [];
    for (let end = termIndex; end <= terms.length; end++) {
      const runMappings = gapName === '' ?
          [ mapping ] :
        matchTermGaps(
          dataFactory.variable(gapName),
          dataFactory.sequence!(terms.slice(termIndex, end)),
          mapping,
          dataFactory,
        );
      for (const runMapping of runMappings) {
        mappings.push(...matchMembersGaps(patterns, patternIndex + 1, terms, end, runMapping, dataFactory));
      }
    }
    return mappings;
  }
  if (termIndex >= terms.length) {
    return [];
  }
  return matchTermGaps(member, terms[termIndex], mapping, dataFactory)
    .flatMap(next => matchMembersGaps(patterns, patternIndex + 1, terms, termIndex + 1, next, dataFactory));
}

/**
 * Check if a term is a variable.
 * @param {RDF.Term} term An RDF term.
 * @return {any} If the term is a variable or blank node.
 */
export function isTermVariable(term: RDF.Term): term is RDF.Variable {
  return term.termType === 'Variable';
}

/**
 * Get all variables in the given pattern.
 * No duplicates are returned.
 * @param {RDF.BaseQuad} pattern A quad pattern.
 */
export function getVariables(pattern: RDF.BaseQuad): RDF.Variable[] {
  // rdf-array: a named gap `...?rest` binds ?rest, an unnamed gap `...` binds nothing
  return uniqTerms(getTermsNested(pattern).filter(isTermVariable).flatMap((variable) => {
    const gapName = gapVariableName(variable);
    if (gapName === undefined) {
      return [ variable ];
    }
    return gapName === '' ? [] : [ DF.variable(gapName) ];
  }));
}

/**
 * A helper function to find a hash with quad elements that have duplicate variables.
 *
 * @param {RDF.Quad} pattern A quad pattern.
 *
 * @return {{[p: string]: string[]}} If no equal variable names are present in the four terms, this returns undefined.
 *                                   Otherwise, this maps quad elements paths (['subject'], ['predicate'], ['object'],
 *                                   ['graph'])
 *                                   to the list of quad elements it shares a variable name with.
 *                                   For quoted triples, paths such as ['subject', 'object'] may occur.
 *                                   If no links for a certain element exist, this element will
 *                                   not be included in the hash.
 *                                   Note 1: Quad elements will never have a link to themselves.
 *                                           So this can never occur: { subject: [[ 'subject']] },
 *                                           instead 'null' would be returned.
 *                                   Note 2: Links only exist in one direction,
 *                                           this means that { subject: [[ 'predicate']], predicate: [[ 'subject' ]] }
 *                                           will not occur, instead only { subject: [[ 'predicate']] }
 *                                           will be returned.
 *                                   Note 3: Keys can also be paths, but they are delimited by '_', such as:
 *                                           { subject_object_subject: [[ 'predicate']] }
 */
export function getDuplicateElementLinks(pattern: RDF.BaseQuad): Record<string, NestedTermKey[][]> | undefined {
  // Collect a variable to quad elements mapping.
  const variableElements: Record<string, NestedTermKey[][]> = {};
  let duplicateVariables = false;
  forEachTermsNested(pattern, (value, keys) => {
    if (value.termType === 'Variable') {
      const val = termToString(value);
      const length = (variableElements[val] || (variableElements[val] = [])).push(keys);
      duplicateVariables = duplicateVariables || length > 1;
    }
  });

  if (!duplicateVariables) {
    return;
  }

  // Collect quad element to elements with equal variables mapping.
  const duplicateElementLinks: Record<string, NestedTermKey[][]> = {};
  for (const variable in variableElements) {
    const elements = variableElements[variable];
    const remainingElements = elements.slice(1);
    // Only store the elements that have at least one equal element.
    if (remainingElements.length > 0) {
      duplicateElementLinks[elements[0].join('_')] = remainingElements;
    }
  }

  return duplicateElementLinks;
}

/**
 * Set the metadata of the bindings stream derived from the metadata of the quads stream.
 * @param dataFactory The data factory.
 * @param {BindingsStream} bindings The bindings stream that will receive the metadata property.
 * @param {AsyncIterator<Quad>} quads The quads stream that is guaranteed to emit the metadata property.
 * @param elementVariables Mapping of quad term name to variable name.
 * @param variables Variables to include in the metadata
 * @param forceEstimateCardinality Set the cardinality to estimate
 * @return {() => Promise<{[p: string]: any}>} A lazy promise behind a callback resolving to a metadata object.
 */
export function setMetadata(
  dataFactory: ComunicaDataFactory,
  bindings: BindingsStream,
  quads: AsyncIterator<RDF.Quad>,
  elementVariables: Record<string, string>,
  variables: RDF.Variable[],
  forceEstimateCardinality: boolean,
): void {
  const getMetadataCb = (metadataRaw: Record<string, any>): void => {
    if (forceEstimateCardinality) {
      metadataRaw.cardinality.type = 'estimate';
    }
    bindings.setProperty(
      'metadata',
      quadsMetadataToBindingsMetadata(dataFactory, validateMetadataQuads(metadataRaw), elementVariables, variables),
    );

    // Propagate metadata invalidations
    if (metadataRaw.state) {
      metadataRaw.state.addInvalidateListener(() => {
        setMetadata(dataFactory, bindings, quads, elementVariables, variables, forceEstimateCardinality);
      });
    }
  };

  const metadata = quads.getProperty('metadata');
  if (metadata) {
    // This is to enforce sync metadata setting, because AsyncIterator will always call it async,
    // even if the property was already defined.
    getMetadataCb(metadata);
  } else {
    quads.getProperty('metadata', getMetadataCb);
  }
}

/**
 * Convert the metadata of quads to the metadata of bindings.
 * @param dataFactory The data factory.
 * @param metadataQuads Quads metadata.
 * @param elementVariables A mapping from quad elements to variables.
 * @param variables The variables in the bindings.
 */
export function quadsMetadataToBindingsMetadata(
  dataFactory: ComunicaDataFactory,
  metadataQuads: MetadataQuads,
  elementVariables: Record<string, string>,
  variables: RDF.Variable[],
): MetadataBindings {
  return {
    ...metadataQuads,
    order: metadataQuads.order ?
      quadsOrderToBindingsOrder(dataFactory, metadataQuads.order, elementVariables) :
      undefined,
    termOrder: metadataQuads.termOrder ?
      quadsOrderToBindingsOrder(dataFactory, metadataQuads.termOrder, elementVariables) :
      undefined,
    availableOrders: metadataQuads.availableOrders ?
      metadataQuads.availableOrders.map(orderDef => ({
        cost: orderDef.cost,
        terms: quadsOrderToBindingsOrder(dataFactory, orderDef.terms, elementVariables),
      })) :
      undefined,
    variables: variables.map(variable => ({ variable, canBeUndef: false })),
  };
}

/**
 * Convert the quads order metadata element to a bindings order metadata element.
 * @param dataFactory The data factory.
 * @param quadsOrder Quads order.
 * @param elementVariables A mapping from quad elements to variables.
 */
export function quadsOrderToBindingsOrder(
  dataFactory: ComunicaDataFactory,
  quadsOrder: TermsOrder<RDF.QuadTermName>,
  elementVariables: Record<string, string>,
): TermsOrder<RDF.Variable> {
  const mappedVariables: Record<string, boolean> = {};
  return <TermsOrder<RDF.Variable>> quadsOrder.map((entry) => {
    // Omit entries that do not map to a variable
    const variableName = elementVariables[entry.term];
    if (!variableName) {
      // eslint-disable-next-line array-callback-return
      return;
    }

    // Omit entries that have been mapped already
    if (mappedVariables[variableName]) {
      // eslint-disable-next-line array-callback-return
      return;
    }

    mappedVariables[variableName] = true;
    return {
      term: dataFactory.variable(variableName),
      direction: entry.direction,
    };
  }).filter(Boolean);
}

/**
 * Perform post-match-filtering if the source does not support quoted triple filtering,
 * but we have a variable inside a quoted triple or (rdf-array) inside a sequence.
 * @param pattern The current quad pattern operation.
 * @param it The iterator to filter.
 */
export function filterMatchingQuotedQuads(pattern: RDF.BaseQuad, it: AsyncIterator<RDF.Quad>): AsyncIterator<RDF.Quad> {
  if (someTerms(pattern, term => term.termType === 'Quad' || term.termType === 'Sequence')) {
    it = hasGaps(pattern) ?
      it.filter(quad => matchPatternGaps(quad, pattern, DF).length > 0) :
      it.filter(quad => matchPatternMappings(quad, pattern));
  }
  return it;
}
