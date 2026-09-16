import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DynamicTaskForm } from './dynamic-task-form'

afterEach(cleanup)

describe('dynamic task form', () => {
  it('validates required fields and returns typed values', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<DynamicTaskForm definition={{ schema: { type: 'object', required: ['outcome', 'rationale'], properties: {
      outcome: { type: 'string', title: 'Outcome', enum: ['upheld', 'rejected'] },
      rationale: { type: 'string', title: 'Rationale' },
      amount: { type: 'integer', title: 'Amount' },
      reference: { type: 'string', title: 'Reference' },
    } }, uiSchema: { rationale: { widget: 'textarea' } } }} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Complete task' }))
    expect(onSubmit).not.toHaveBeenCalled()
    await user.selectOptions(screen.getByLabelText('Outcome'), 'upheld')
    await user.type(screen.getByLabelText('Rationale'), 'Merchant evidence confirms the charge')
    await user.type(screen.getByLabelText('Amount'), '125')
    await user.type(screen.getByLabelText('Reference'), 'DOC-42')
    await user.click(screen.getByRole('button', { name: 'Complete task' }))

    expect(onSubmit).toHaveBeenCalledWith({ outcome: 'upheld', rationale: 'Merchant evidence confirms the charge', amount: 125, reference: 'DOC-42' })
  })
  /**
   * `case-contract-v1.schema.json` constrains a form's `schema` to `{ "type": "object" }` and
   * nothing more, so `{}` is a schema a case author can legitimately publish. Reading
   * `schema.properties` unguarded threw here and took the completion dialog down with it.
   */
  it('refuses a valid schema that declares no fields instead of throwing', () => {
    const onSubmit = vi.fn()
    render(<DynamicTaskForm definition={{ schema: {} }} onSubmit={onSubmit} />)

    expect(screen.getByRole('alert')).toHaveTextContent('declares no fields')
    expect(screen.getByRole('button', { name: 'Complete task' })).toBeDisabled()
  })

  it('treats an empty property set as a task that asks for nothing', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<DynamicTaskForm definition={{ schema: { type: 'object', properties: {} } }} onSubmit={onSubmit} />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Complete task' }))
    expect(onSubmit).toHaveBeenCalledWith({})
  })
})
