import produce from "immer"
import {
  MutStore,
  Setter,
  STATE,
  flush,
  EMPTY,
  FunctionSetter,
  isFunctionSetter,
} from "./store"

export class Store<T> extends MutStore<T> {
  set(setter: Setter<T>) {
    let prev = this[STATE]
    let result: T = (
      isFunctionSetter(setter) ? produce(prev, setter) : setter
    ) as T
    if (result === EMPTY) {
      // @ts-ignore
      result = undefined
    }
    if (result !== this[STATE]) {
      this[STATE] = result
      this.queue()
      flush()
    }
  }
}
