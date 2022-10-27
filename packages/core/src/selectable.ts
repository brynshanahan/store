import produce from "immer"
import { MutableSelectable } from "./mutable-selectable"
import { Callback } from "./types"

export class Selectable<T> extends MutableSelectable<T> {
  set(updater: Callback<T, T | undefined | void>) {
    let change = produce(this.state, updater)

    if (change !== this.state) {
      this.state = change as T
      this.version++
      this.flush()
    }
  }
}
