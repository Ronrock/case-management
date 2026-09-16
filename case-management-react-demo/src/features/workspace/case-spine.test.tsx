import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { CaseSummary, CaseWorkspaceSnapshot } from '@/lib/api-types'
import { CaseSpine } from './case-spine'

afterEach(cleanup)

const caseItem: CaseSummary = {
  id: 'case-1',
  tenantId: 't1',
  caseDefinitionKey: 'complaint',
  caseDefinitionVersion: 1,
  title: 'Complaint',
  state: 'ACTIVE',
  version: 1,
  availableActions: [],
}

function snapshot(partial: Partial<CaseWorkspaceSnapshot> = {}): CaseWorkspaceSnapshot {
  return { case: caseItem, tasks: [], planItems: [], milestones: [], slas: [], events: [], ...partial }
}

describe('case spine', () => {
  /**
   * The API mixes UTC engine times with offset-bearing times. `2026-09-02T12:27:00+08:00` is
   * 04:27Z — earlier than 05:10Z — but sorts after it as text, which is how the spine and the
   * activity panel came to disagree about the order of the same case's history.
   */
  it('orders mixed-offset timestamps by instant, not by their text', () => {
    render(<CaseSpine snapshot={snapshot({
      events: [
        { id: 'event-late', type: 'case.closed', time: '2026-09-02T05:10:00Z' },
        { id: 'event-early', type: 'case.assessed', time: '2026-09-02T12:27:00+08:00' },
      ],
    })} />)

    const labels = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(labels[0]).toContain('Case.assessed')
    expect(labels[1]).toContain('Case.closed')
  })

  /** An unparseable time is unknown, not the beginning of the case: it sorts last, deterministically. */
  it('places entries with an unusable timestamp last', () => {
    render(<CaseSpine snapshot={snapshot({
      events: [
        { id: 'event-broken', type: 'case.unknown', time: 'not-a-timestamp' },
        { id: 'event-real', type: 'case.opened', time: '2026-09-02T05:10:00Z' },
      ],
    })} />)

    const labels = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(labels[0]).toContain('Case.opened')
    expect(labels[1]).toContain('Case.unknown')
  })
})
