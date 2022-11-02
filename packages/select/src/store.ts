import { strictEqual } from "./equality-checks"

export const SUBS = Symbol("subscriber")
export const STATE = Symbol("state")

export type Selector<T, R> = (state: T, prevState: T | undefined) => R
export type OnChange<T = any> = (slice: T, prev?: T) => any
export type Subscriber = () => any
export type Callback = () => any
export type Subscription = () => void
export type FunctionSetter<T> = (state: T) => T | void
// If the "value" is a function then they must use a function setter
export type Setter<T> = T extends (...args: any[]) => any
  ? FunctionSetter<T>
  : T | FunctionSetter<T>

let depTracking: Set<StoreApi<any>> | null = null
let flushing: Callback | null = null

export function isFunctionSetter<T>(val: any): val is FunctionSetter<T> {
  return typeof val === "function"
}

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

export function modify<T>(value: T, modifier: Setter<T>): T {
  if (isFunctionSetter(modifier)) {
    let result = modifier(value)

    // The value has been mutated
    if (result === undefined) {
      return value
    } else {
      // @ts-ignore
      return result === EMPTY ? undefined : result
    }
  }

  // @ts-ignore
  return modifier === EMPTY ? undefined : modifier
}

export class MutStore<T> implements StoreApi<T> {
  [STATE]: T = EMPTY as any;
  [SUBS] = new Set<Callback>()

  initialState!: T

  get state(): T {
    if (depTracking) {
      depTracking.add(this)
    }
    let val = this[STATE]
    return val === EMPTY ? this.initialState : val
  }

  set state(value: T) {
    this[STATE] = value
  }

  constructor(initialState: T = EMPTY as any) {
    if (initialState !== EMPTY) {
      this[STATE] = this.initialState = initialState
    }
  }

  queue() {
    for (let cb of this[SUBS]) {
      notifiers.add(cb)
    }
  }

  set(setter: Setter<T>) {
    let prev = this[STATE]
    this[STATE] = modify(prev, setter)
    this.queue()
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
  onChange: OnChange<Slice>,
  equalityFn?: <A extends Slice, B extends Slice | undefined>(
    a: A,
    b?: B
  ) => boolean
): SelectResult<Slice>
export function select<Slice>(
  selector: () => Slice,
  onChange: OnChange<Slice>,
  equalityFn: <A extends Slice, B extends Slice | undefined>(
    a: A,
    b?: B
  ) => boolean = strictEqual
): Subscription {
  let prev: Slice | undefined = undefined
  let stores = new Set<StoreApi<any>>()
  let clearSubscription: Subscription = () => {}

  function subscriber() {
    let ourPrev = prev
    clearSubscription()
    const slice = collect(() => selector(), stores)
    clearSubscription = subscribe(stores, subscriber)

    if (!equalityFn(slice, prev)) {
      prev = slice
      onChange(slice, ourPrev)
    }
  }

  subscriber()

  return () => {
    clearSubscription()
    notifiers.delete(subscriber)
  }
}
