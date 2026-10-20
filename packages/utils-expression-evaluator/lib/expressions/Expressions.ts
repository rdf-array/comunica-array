import type { TermType } from '@comunica/types';

export function asTermType(type: string): TermType | undefined {
  if (type === 'namedNode' || type === 'literal' || type === 'blankNode' || type === 'quad' || type === 'sequence') {
    return type;
  }
  return undefined;
}
