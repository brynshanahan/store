### React hooks

A hook to use values from selectable stores

```tsx
import { MutableSelectable } from '@selkt/core'
import { useSelectable } from '@selkt/react'

interface User {
  name: string
  age: string
}

let store = new MutableSelectable({
  likes: 0,
  user: undefined as User | undefined,
})

export default function App() {
  const username = useSelectable(store, (state) => state.user.name) || 'Anon'
  /* This component will only update when likes gets over 50 or the username changes */
  const disabled = useSelectable(store, (state) => state.likes > 50)

  function login() {
    store.set((state) => {
      state.user = {
        name: 'Lorem Ipsum',
        age: '1000 years old',
      }
    })
  }

  return (
    <div>
      <h1>{username}</h1>
      <Suspense fallback={<div>Login</div>}>
        <Profile />
      </Suspense>
      <div>
        <button onClick={login}>Login</button>
      </div>
      <div>
        <LikesButton disabled={disabled} />
      </div>
    </div>
  )
}

function Profile() {
  let username = useSelectableSuspense(store, (state) => state.user.name)

  return <div>User {username}</div>
}

function LikesButton({ disabled = false }) {
  const likes = useSelectable(store, (state) => state.likes)
  return (
    <button
      disabled={disabled}
      onClick={(e) =>
        store.set((state) => {
          state.likes++
        })
      }
    >
      Likes {likes}
    </button>
  )
}
```
