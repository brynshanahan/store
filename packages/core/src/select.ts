import { SelectableInterface } from "./types"

export function select<T>(
  selectables: SelectableInterface<any>[],
  selector: () => T,
  onChange: (value: T) => any
) {
  let value: T
  let stoppers = []

  for (let selectable of selectables) {
    stoppers.push(selectable.subscribe(() => selec))
  }
}
