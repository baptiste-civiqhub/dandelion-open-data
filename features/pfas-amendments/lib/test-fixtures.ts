import type { PfasAmendment } from '@/apis/pfas-amendments/types'

export function makeAmendment(overrides: Partial<PfasAmendment> = {}): PfasAmendment {
  const number = overrides.number ?? '1'
  return {
    id: `amdt-${number}`,
    number,
    numberLabel: number,
    rectification: null,
    nature: 'Amt',
    subdivision: 'Article 1er',
    subdivisionRaw: 'Article 1er',
    targetPlacement: { kind: 'article', position: null, article: 'Article 1er' },
    paragraph: null,
    author: null,
    onBehalfOf: null,
    filedOn: null,
    proposalText: '',
    explanatoryText: '',
    outcomeRaw: null,
    outcomeRecordedAt: null,
    sourceUrl: null,
    sourceUrlRaw: null,
    senatorUrl: null,
    parentId: null,
    parentRelation: null,
    rowIndex: 0,
    ...overrides
  }
}
