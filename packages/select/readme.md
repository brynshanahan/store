## Selkt

#### Simple state management

<br/>

---

<br/>

There are two main exports from `@selkt/core`: Selectable and MutableSelectable. They both have the same interface but the Selectable uses immerjs to ensure that objects are never modifed

```ts
import { Selectable } from '@selkt/core'

type User = string
type State = { count: number, user: User }

const store = new Selectable<State>({ count: 1, user: "test" })

let unsubscribe = store.select(
  state => state.count % 2 || user
  value => console.log(value),
  // optional
  (prevState, nextState) => prevState === nextState
)

store.set(state => {
  state.count += 2
})

// log: 4

store.set(state => {
  state.count++
})

// log: "test"


export const store
```
