## Store

Small selectable state

### Vanilla JS

#### class Store, class MutStore

All stores expose a `set` method. The `set` method accepts a function or a value. If a function is passed, the function will be called with the current value of the store. The function can mutate current state or return a new value. The new value will be assigned to the `.state` property of the store.

#### function select

The `select` accepts a callback (selector) that should return values from stores. When a store's .state property is accessed it will subscribe the selector to that store. If the store is updated with .set the selector will be called again.

When the value returned by the selector is different from the previous value, the onChange callback will be called with the new and previous values. The onChange callback will be called with the initial value and undefined when the selector is created.

```ts
function select(
  selector: () => Slice,
  onChange?: (slice: Slice, prev: Slice | undefined)
): () => void;
```

Here is an example of how the subscriptions work

```ts
import { Store, select } from "store"

const toggle = new Store(true)
const a = new Store("a")
const b = new Store("b")

const selector = () => (toggle.state ? b.state : c.state)
const onChange = (value, prev) => console.log(value, prev)

select(selector, onChange)

// onChange will be called with 'a', undefined and will be listening to changes in toggle and a
toggle.set(false)
// onChange will be called with 'b', 'a' and will be listening to changes in toggle and b
a.set("a1") // selector will not be re-run
b.set("b1") // onChange will be called with 'b1', 'b'
```

#### MutStore – Mutable state

MutStore is a store that lets you mutate the state directly. It is useful when you are frequently calling `.set` and you don't need to subscribe to root objects (ie you only subscribe to the edges of your json object)

```ts
import { MutStore, select } from "select"

let initialState = {
  posts: [
    {
      likes: 0,
    },
  ],
}

let store = new MutStore(initialState)

const onChangeEdge = () => {}
const onChangeRoot = () => {}
// onChangeEdge will be called with 0, undefined
select(() => store.state.posts[0].likes, onChangeEdge)
// onChangeEdge will be called with store.state.posts, 0
select(() => store.state.posts, onChangeRoot)

// onChangeEdge will be called with 1, 0 but onChangeRoot will not be called because the root object is still the same object
store.set((state) => {
  state.posts[0].likes++
})
```

#### Store – Immutable state

Store implements the same interface as MutStore but it uses immer to create a new state object when you call `.set` rather than letting you mutate the state directly.

You will have to install immer to use this store

```sh
# npm
npm i immer
# yarn
yarn add immer
```

```ts
import { Store } from "select"

let initialState = {
  user: "anonymous",
  time: Date.now(),
}

let store = new Store(initialState)

store.set((state) => {
  state.user = "bob"
  state.time = Date.now()
})

// initialState !== store.state
```

You use the `select` function to subscribe to changes in the store exactly the same way as you would with MutStore

```ts
import { Store, select } from "select"

let store = new Store({
  posts: [
    {
      likes: 0,
    },
  ],
})

const onChange = (firstPost, prev) => {}
select(() => store.state.posts[0], onChange)
/*
Because Store uses immer, whenever any property is mutated all the containing objects will be referentially new objects so the onChange callback would be re-run
*/
```

### useSelect

You can use stores in React with the `useStore` hook. It has a very similar api to the select function

```tsx
import { MutStore, select } from "select"

let store = new MutStore(0)

export default function App() {
  let num = useStore(() => store.state * 2)

  const onClick = () => {
    store.set((state) => ++state)
  }

  return <div onClick={onClick}>{num}</div>
}
```
