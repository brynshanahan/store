import { useEffect, useMemo, useReducer, useRef } from "react"
import { useSyncExternalStore } from "use-sync-external-store/shim"
import { strictEqual, select } from "./index"

console.log({ useSyncExternalStore })

export function useSelect<TSlice>(
  sel: () => TSlice,
  equalityCheck: (a: TSlice, b: TSlice | undefined) => boolean = strictEqual
): TSlice {
  // const [slice, rerender] = useReducer(
  //   (prev: TSlice | undefined) => {
  //     let slice = sel()
  //     if (equalityCheck(slice, prev)) {
  //       return prev
  //     }
  //     return slice
  //   },
  //   undefined,
  //   () => sel()
  // )

  // useEffect(() => {
  //   let unsub = select(sel, rerender, equalityCheck)
  //   rerender()
  //   return unsub
  // }, [])

  const refs = useRef({ sel, equalityCheck })

  refs.current.sel = sel
  refs.current.equalityCheck = equalityCheck

  const store = useMemo(
    () =>
      select(
        () => refs.current.sel(),
        () => {},
        (a, b) => refs.current.equalityCheck(a, b)
      ),
    []
  )

  const slice = useSyncExternalStore(
    store.subscribe,
    () => store.state,
    () => store.state
  )

  return slice as TSlice
}
