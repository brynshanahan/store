import { shallowEqualArray, strictEqual } from "./equality-checks"
import type {
  Callback,
  Callback2,
  Callback2Opt,
  SelectableInterface,
} from "./types"

let flushing: false | (() => any) = false

export class MutableSelectable<T> implements SelectableInterface<T> {
  private meta = {
    stores: {
      computations: new Set<Callback<T>>(),
      subscriptions: new Set<Callback<T>>(),
    },
    storeNames: ["computations", "subscriptions"],
    currentStore: "subscriptions",
    withStore: <T>(name: string, callback: () => T) => {
      if (!this.meta.stores[name]) {
        throw new Error("Store " + name + " does not exist")
      }

      let prev = this.meta.currentStore
      this.meta.currentStore = name
      let result = callback()
      this.meta.currentStore = prev
      return result
    },
  }

  state: T
  version: number = 0

  constructor(initialState: T) {
    this.state = initialState
  }

  flush(callback?: () => any) {
    if (callback) {
      if (!flushing) {
        flushing = callback
      }
      callback()
    }

    if (!flushing || flushing === callback) {
      flushing = false
      for (let groupName of this.meta.storeNames) {
        for (let listener of this.meta.stores[groupName]) {
          listener(this.state)
        }
      }
    }
  }
  subscribe(callback: Callback<T>) {
    let store = this.meta.stores[this.meta.currentStore]
    store.add(callback)
    return Object.assign(
      () => {
        store.delete(callback)
      },
      { update: () => callback(this.state) }
    )
  }
  set(updater: Callback<T, T | undefined | void>) {
    let result = updater(this.state)

    if (typeof result !== "undefined") {
      this.state = result
    }

    this.version++
    this.flush()
  }

  compute<Slice, Result>(
    selector: Callback<T, Slice>,
    mapper: Callback<Slice, Result>
  ) {
    let selected: ReturnType<typeof selector>
    let value: ReturnType<typeof mapper>
    let created = false

    let stop = this.meta.withStore("computations", () =>
      this.select(selector, (slice) => {
        selected = slice
        created = false
      })
    )

    return Object.assign(
      () => {
        if (!created) {
          value = mapper(selected)
          created = true
        }
        return value
      },
      { stop }
    )
  }

  select<V>(
    selector: Callback<T, V>,
    onChange: Callback2Opt<V>,
    equalityCheck: Callback2<V, boolean> = strictEqual
  ) {
    /* 
    We pass in the previos state if the onChange callback has at least 2 arguments or no arguments.
    This is because functions that use the ...args operator will report as having 0 arguments
    eg.
      (function(...args) {}).length === 0
     */
    const shouldMemo = onChange.length > 1 || onChange.length === 0
    let prev: V
    prev = selector(this.state)
    shouldMemo ? onChange(prev, undefined) : onChange(prev)
    return this.subscribe((state) => {
      let current: V
      current = selector(state)
      if (!equalityCheck(prev, current)) {
        let memo = undefined
        if (shouldMemo) {
          memo = prev
        }
        prev = current
        shouldMemo ? onChange(prev, memo) : onChange(prev)
      }
    })
  }
  destroy() {
    for (let groupName of this.meta.storeNames) {
      this.meta.stores[groupName].clear()
    }
  }
}
