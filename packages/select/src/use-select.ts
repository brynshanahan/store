import { useEffect, useReducer } from "react"
import { strictEqual, select } from "./index"

export function useSelect<TSlice>(
  sel: () => TSlice,
  equalityCheck: (a: TSlice, b: TSlice | undefined) => boolean = strictEqual
): TSlice {
  const [slice, rerender] = useReducer(
    (prev: TSlice | undefined) => {
      let slice = sel()
      if (equalityCheck(slice, prev)) {
        return prev
      }
      return slice
    },
    undefined,
    sel
  )

  useEffect(() => select(sel, rerender, equalityCheck), [])

  return slice as TSlice
}
