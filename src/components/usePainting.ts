import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type Op, fillsOf, isComplete, push, undo as undoOps } from '../lib/paint'
import { cheer } from '../lib/sound'
import { type Kind, loadOps, saveOps } from '../lib/storage'
import { count } from '../online/stats'

/** Drawing state of one picture / statue: operation list, undo, auto-save and the "finished" celebration. */
export function usePainting(kind: Kind, id: string, requiredIds: readonly string[]) {
  const [ops, setOps] = useState<Op[]>(() => loadOps(kind, id))
  const [party, setParty] = useState(0)
  const fills = useMemo(() => fillsOf(ops), [ops])
  const complete = isComplete(fills, requiredIds)
  const wasComplete = useRef(complete)

  useEffect(() => saveOps(kind, id, ops), [kind, id, ops])
  useEffect(() => {
    if (complete && !wasComplete.current) {
      setParty((n) => n + 1)
      cheer()
    }
    wasComplete.current = complete
  }, [complete])

  // anonymous statistics: a 2D picture counts when opened, a 3D statue when it is first painted
  const counted = useRef(false)
  useEffect(() => {
    if (kind === '2d') count('pic2d')
  }, [kind, id])
  const add = useCallback(
    (...next: Op[]) => {
      if (kind === '3d' && !counted.current) {
        counted.current = true
        count('statue3d')
      }
      setOps((cur) => next.reduce(push, cur))
    },
    [kind],
  )
  const undo = useCallback(() => setOps(undoOps), [])
  return { ops, fills, complete, party, add, undo }
}
