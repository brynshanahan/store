import { strictEqual } from "./equality-checks"

export const SUBS = Symbol("subscriber")
export const STATE = Symbol("state")

const LIMIT = 5

export type Selector<T, R> = (state: T, prevState: T | undefined) => R
export type OnChange<T = any> = (slice: T) => any
export type Subscriber = () => any
export type Callback = () => any
export type Subscription = () => void
export type FunctionSetter<T> = (state: T) => T | void
export type Setter<T> = T extends (...args: any[]) => any
  ? FunctionSetter<T>
  : T | FunctionSetter<T>

let depTracking: Set<StoreApi<any>> | null = null
let flushing: Callback | null = null

export const EMPTY = {}

export type StoreApi<T> = {
  set: (set: Setter<T>) => T | void
  [SUBS]: Set<Subscriber>
  [STATE]: T
  initialState: T
  get state(): T
  set state(value: T)
}

let notifiers: Set<Callback> = new Set()

export function modify<T>(value: T, modifier: Setter<T>) {
  if (typeof modifier === "function") {
    let result = modifier(value)

    if (result === undefined) {
      return value
    } else if (result === EMPTY) {
      return undefined
    } else {
      return result
    }
  } else if (value === EMPTY) {
    return undefined
  } else {
    return modifier
  }
}

export class MutStore<T> implements StoreApi<T> {
  [STATE]: T;
  [SUBS] = new Set<Callback>()

  initialState: T

  get state(): T {
    if (depTracking) {
      depTracking.add(this)
    }
    return this[STATE]
  }

  constructor(initialState: T) {
    this[STATE] = this.initialState = initialState
  }

  notify() {
    for (let cb of this[SUBS]) {
      notifiers.add(cb)
    }
  }

  set(setter: Setter<T>) {
    let prev = this[STATE]
    this[STATE] = modify(prev, setter)
    this.notify()
    flush()
  }
}

function subscribe(stores: Iterable<StoreApi<any>>, sub: Subscriber) {
  for (const store of stores) {
    store[SUBS].add(sub)
  }
  return () => {
    for (const store of stores) {
      store[SUBS].delete(sub)
    }
    notifiers.delete(sub)
  }
}

export function collect(
  callback: Subscriber,
  stores: Set<StoreApi<any>> = new Set()
) {
  stores.clear()
  depTracking = stores
  let result = callback()
  depTracking = null
  return result
}

export function notify() {
  for (let notifier of notifiers) {
    notifier()
  }
  notifiers.clear()
}

export function flush(callback: Callback | null = null) {
  if (callback) {
    if (!flushing) {
      flushing = callback
    }
    callback()
  }

  if (!flushing || flushing === callback) {
    flushing = null
    notify()
  }
}

export function flushed(callback: Callback) {
  return () => flush(callback)
}

type SelectResult<Slice> = {
  (): void
  state: Slice | undefined
  subscribe(cb: OnChange<Slice>): () => void
}

export function select<Slice>(
  selector: () => Slice,
  equalityFn: <A extends Slice, B extends Slice | undefined>(
    a: A,
    b?: B
  ) => boolean
): SelectResult<Slice>
export function select<Slice>(
  selector: () => Slice,
  onChange?: (value: Slice, prev: Slice | undefined) => any,
  equalityFn: <A extends Slice, B extends Slice | undefined>(
    a: A,
    b?: B
  ) => boolean = strictEqual
): SelectResult<Slice> {
  let prev: Slice | undefined = undefined
  let stores = new Set<StoreApi<any>>()
  let clearSubscription: Subscription = () => {}
  let changers = new Set()
  if ()

  const update = (value: Slice, prev?: Slice) => {
    for (let changer of changers) {
      changer(value, prev)
    }
  }

  const subscriber = () => {
    let ourPrev = prev
    clearSubscription()
    const slice = collect(() => selector(), stores)
    clearSubscription = subscribe(stores, subscriber)

    if (!equalityFn(slice, prev)) {
      prev = slice
      update(slice, ourPrev)
    }
  }

  subscriber()

  const api = () => {
    clearSubscription()
    changers.clear()
  }

  api.state = prev as Slice | undefined

  api.subscribe = (cb: OnChange<Slice>) => {
    changers.add(cb)
    return () => {
      console.log("unsub")
      changers.delete(cb)
    }
  }

  Object.defineProperty(api, "state", {
    get() {
      return prev
    },
  })

  return api
}
