import produce from "immer"
import { MutStore, Setter, STATE, flush, EMPTY, FunctionSetter } from "./store"

function isFunctionSetter(val: any): val is FunctionSetter<any> {
  return typeof val === "function"
}

export class Store<T> extends MutStore<T> {
  set(setter: Setter<T>) {
    let prev = this[STATE]
    let result = isFunctionSetter(setter) ? produce(prev, setter) : setter
    if (result === EMPTY) {
      result = undefined
    }
    if (result !== this[STATE]) {
      this[STATE] = result
      this.notify()
      flush()
    }
  }
}
