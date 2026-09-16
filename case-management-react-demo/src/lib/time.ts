/**
 * Chronological ordering for API timestamps.
 *
 * The API mixes UTC event times (`2026-09-02T04:27:00Z`) with offset comment times
 * (`2026-09-02T12:27:00+08:00`). Those two strings cannot be ordered by comparing their text:
 * lexically `12:27+08:00` sorts after `04:27Z`, chronologically they are the same instant. Every
 * view that interleaves facts from more than one source therefore has to compare parsed instants,
 * and has to agree with every other view about what to do with a timestamp it cannot parse.
 */

/** Epoch milliseconds for an API timestamp, or `null` when it is absent or unparseable. */
export function instant(value?: string | null): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * Oldest first. An entry whose time cannot be parsed sorts last rather than to one extreme of
 * the timeline: an unreadable timestamp is unknown, not "the beginning of time".
 */
export function oldestFirst(left?: string | null, right?: string | null) {
  return compare(instant(left), instant(right), 1)
}

/** Newest first, with the same treatment of unknown times. */
export function newestFirst(left?: string | null, right?: string | null) {
  return compare(instant(left), instant(right), -1)
}

function compare(left: number | null, right: number | null, direction: 1 | -1) {
  if (left === null || right === null) {
    if (left === right) return 0
    return left === null ? 1 : -1
  }
  return (left - right) * direction
}
