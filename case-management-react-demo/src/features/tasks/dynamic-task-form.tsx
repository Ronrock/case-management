import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { TaskFormDefinition } from '@/lib/api-types'

interface DynamicTaskFormProps {
  definition: TaskFormDefinition
  onSubmit(values: Record<string, unknown>): void | Promise<void>
  submitting?: boolean
}

export function DynamicTaskForm({ definition, onSubmit, submitting = false }: DynamicTaskFormProps) {
  const [error, setError] = useState('')
  const fields = declaredFields(definition)
  const unsupported = fields === undefined
    ? undefined
    : fields.find(([, property]) => !['string', 'integer'].includes(property.type))
  // Undeclared fields and zero declared fields are different answers. `{ "properties": {} }` is a
  // task that genuinely asks for nothing and can be completed; a schema with no `properties` at
  // all leaves this renderer unable to say what the task needs, so it must refuse rather than
  // silently submit an empty payload for a form that may require data.
  const undeclared = fields === undefined
  const blocked = undeclared || Boolean(unsupported)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (blocked || !fields) return
    const form = event.currentTarget
    if (!form.reportValidity()) {
      setError('Complete every required field.')
      return
    }
    const data = new FormData(form)
    const values: Record<string, unknown> = {}
    for (const [name, property] of fields) {
      const raw = String(data.get(name) ?? '')
      if (raw === '') continue
      values[name] = property.type === 'integer' ? Number.parseInt(raw, 10) : raw
    }
    setError('')
    await onSubmit(values)
  }

  return (
    <form className="grid gap-4" onSubmit={submit} noValidate>
      {(fields ?? []).map(([name, property]) => {
        const label = property.title || humanize(name)
        const required = definition.schema.required?.includes(name)
        const id = `task-field-${name}`
        return (
          <div className="grid gap-2" key={name}>
            <Label htmlFor={id}>{label}{required ? <span aria-hidden="true"> *</span> : null}</Label>
            {property.enum ? (
              <select id={id} name={name} aria-label={label} required={required} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select…</option>
                {property.enum.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
              </select>
            ) : definition.uiSchema?.[name]?.widget === 'textarea' ? (
              <Textarea id={id} name={name} aria-label={label} required={required} />
            ) : (
              <Input id={id} name={name} aria-label={label} type={property.type === 'integer' ? 'number' : 'text'} step={property.type === 'integer' ? 1 : undefined} required={required} />
            )}
          </div>
        )
      })}
      {undeclared ? <p role="alert" className="text-sm text-destructive">This task&apos;s form declares no fields, so it cannot be completed here. Report it to your case administrator.</p> : null}
      {unsupported ? <p role="alert" className="text-sm text-destructive">Unsupported field {unsupported[0]}: {unsupported[1].type}</p> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={submitting || blocked}>{submitting ? 'Completing…' : 'Complete task'}</Button>
    </form>
  )
}

/**
 * The form's declared fields, or `undefined` when the schema does not declare any. The server
 * validates a form's `schema` only as "an object", so `properties` can be absent, null, or not
 * an object at all; reading it unguarded threw before the dialog could render anything.
 */
function declaredFields(definition: TaskFormDefinition) {
  const properties = definition.schema?.properties
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return undefined
  return Object.entries(properties)
    .filter(([, property]) => Boolean(property) && typeof property === 'object')
}

function humanize(value: string) {
  return value.replace(/[-_]/g, ' ').replace(/^./, (letter) => letter.toUpperCase())
}
