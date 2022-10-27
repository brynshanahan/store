## Selkt

Small selectable state

### Vanilla

#### Mutable state

```ts
import { MutableSelectable } from '@selkt/core'

let initialState = {
  user: 'anonymous',
  time: Date.now()
}

let store = new MutableSelectable(initialState)

setInterval(() => {
  store.set(state => {
    let now = Date.now()
    state.time = now
    state.user = 'anonymous'
  })
}, 100)

// Will log time whenever it is divisible by 1000
let unsub = store.select(
  state => state.time % 1000 ? state.user : state.time
  userOrTime => console.log(userOrTime),
  // equalityFunction
)

// initialState === store.state
```

#### Immutable state

`npm i immer`

```ts
import { Selectable } from '@selkt/core'


let initialState = {
  user: 'anonymous',
  time: Date.now()
}

let store = new Selectable(initialState)

setInterval(() => {
  store.set(state: Draft<State> => {
    let now = Date.now()
    state.time = now
    state.user = 'anonymous'
  })
}, 100)

// Will log time whenever it is divisible by 1000
let unsub = store.select(
  state => state.time % 1000 ? state.user : state.time
  userOrTime => console.log(userOrTime),
  // equalityFunction
)

// initialState !== store.state
```

### React

```tsx
import { MutableSelect } from '@selkt/core'
import { useSelectable } from '@selkt/react'

let store = new MutableSelectable(0)

export default function App() {
  let num = useSelectable(store, (v) => v * 2)

  return <div onClick={(e) => store.set((state) => state + 1)}>{num}</div>
}
```

- [Vanilla](/packages/core/readme.md)
- [Hooks](/packages/react/readme.md)
