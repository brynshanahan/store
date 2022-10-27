import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { strictEqual, Callback, SelectableInterface } from "@selkt/core"

const isoLayoutEffect = // @ts-ignore
  typeof window === "undefined" ? () => {} : useLayoutEffect

const ret: <T>(arg: T) => T = (v) => v
type DeepRequired<T> = T extends object
  ? Required<{
      [K in keyof T]: NonNullable<DeepRequired<T[K]>>
    }>
  : T
export function useSelectable<TState, TSlice = TState>(
  store: SelectableInterface<TState>,
  selector?: (arg: TState) => TSlice,
  equalityCheck?: (arg1: TSlice, arg2: TSlice) => boolean
): TSlice
export function useSelectable<TState = undefined, TSlice = TState>(
  store?: SelectableInterface<TState>,
  selector?: (arg: TState) => TSlice,
  equalityCheck?: (arg1: TSlice, arg2: TSlice) => boolean
): TSlice
export function useSelectable<TState, TSlice = TState>(
  store?: SelectableInterface<TState> | undefined,
  selector?: (arg: TState) => TSlice,
  equalityCheck = strictEqual
): TSlice | undefined {
  let sel = selector ?? (ret as (arg: TState) => TSlice)
  let [state, set] = useState(store ? () => sel(store.state) : undefined)
  let previousRef = useRef(state)

  isoLayoutEffect(() => {
    let current = store ? sel(store.state) : undefined
    if (!equalityCheck(current, previousRef.current)) {
      previousRef.current = current
      set(current)
    }
  }, [store])
  useEffect(() => {
    let current = store ? sel(store.state) : undefined
    if (!equalityCheck(current, previousRef.current)) {
      previousRef.current = current
      set(current)
    }
    if (store) {
      return store.select(
        sel,
        (slice) => {
          if (!equalityCheck(slice, previousRef.current)) {
            previousRef.current = slice
            set(slice)
          }
        },
        equalityCheck
      )
    }
  })

  return state
}
