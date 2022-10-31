import {
  deepEqual,
  select,
  shallowEqual,
  shallowEqualArray,
  flush,
  MutStore,
  Store,
} from "../src"

describe("equalityChecks", () => {
  test("deepEqual checks correctly", () => {
    expect(
      deepEqual({ a: { b: { c: true } } }, { a: { b: { c: true } } })
    ).toBe(true)
    expect(
      deepEqual({ a: { b: { c: false } } }, { a: { b: { c: true } } })
    ).toBe(false)
    expect(deepEqual([{}], [{}])).toBe(true)
    expect(deepEqual({}, undefined)).toBe(false)
    expect(deepEqual({}, { test: true })).toBe(false)
  })

  test("shallowEqualArray checks correctly", () => {
    const a = {}
    expect(shallowEqualArray([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(shallowEqualArray([], [1, 2, 3])).toBe(false)
    expect(shallowEqualArray([a], [a])).toBe(true)
    expect(shallowEqualArray([{}], [{}])).toBe(false)
    expect(shallowEqualArray([true, false], [false, true])).toBe(false)
    expect(shallowEqualArray([true, true], [false, true], 1)).toBe(true)
  })

  test("shallowEqual checks correctly", () => {
    expect(shallowEqual({}, {})).toBe(true)
    expect(shallowEqual({}, undefined)).toBe(false)
    expect(shallowEqual({ a: true }, { a: true })).toBe(true)
    expect(shallowEqual({ a: false, test: false }, { a: true })).toBe(false)
    expect(shallowEqual({ a: false, test: false }, undefined)).toBe(false)
  })
})

describe("MutableStore", () => {
  it("can create a store", () => {
    const store = new MutStore({})

    expect(store)
  })
  it("Immediately calls handler when created", () => {
    let callback = jest.fn()

    let counter = new MutStore({ count: 0 })

    select(() => counter.state.count, callback)

    expect(callback).toBeCalledTimes(1)
    expect(callback).toBeCalledWith(0, undefined)
  })

  it("Accepts different equality functions", () => {
    let callback = jest.fn(console.log)

    let store = new MutStore(0)

    /* Only updates when the first value of the array changes */
    select(
      () => [Math.floor(store.state / 2), store.state] as const,
      ([flag, num]) => {
        callback(num)
      },
      (a, b) => a[0] === b?.[0]
    )

    store.set((s) => s + 1)
    store.set((s) => s + 1)
    store.set((s) => s + 1)

    expect(callback).toBeCalledTimes(2)
    expect(callback).toBeCalledWith(0)
    expect(callback).toBeCalledWith(2)
  })
  it("Cancels subscriptions", () => {
    let callback = jest.fn()

    let store = new MutStore({
      count: 0,
    })

    let sub = select(() => store.state.count, callback)

    store.set((state) => {
      state.count++
      state.count++
    })

    sub()

    store.set((state) => {
      state.count++
    })

    expect(callback).toBeCalledTimes(2)
    expect(callback).toBeCalledWith(0, undefined)
    expect(callback).toBeCalledWith(2, 0)
  })
  it("Mutates values", () => {
    let callback = jest.fn()
    let state = { count: 0 }

    let store = new MutStore(state)

    select(() => store.state.count, callback)

    store.set((state) => {
      state.count++
    })

    expect(state.count).toEqual(1)
  })

  it("Runs immediately with equality assertions", () => {
    let callback = jest.fn()
    let state = { count: 0, likes: 0 }

    let store = new MutStore(state)

    select(
      () => [store.state.count, store.state.likes],
      callback,
      shallowEqualArray
    )

    store.set((state) => {
      state.count++
      state.likes = 10
    })
    store.set((state) => {
      state.count = 1
      state.likes = 10
    })

    expect(state.count).toEqual(1)
    expect(callback).toBeCalledTimes(2)
    expect(callback).toBeCalledWith([0, 0], undefined)
    expect(callback).toBeCalledWith([1, 10], [0, 0])
  })

  it("lazily subscribes", () => {
    let callback = jest.fn()

    let a = new MutStore(0)
    let b = new MutStore(0)

    select(() => {
      if (a.state > 0) {
        return b.state
      } else {
        return a.state
      }
    }, callback)

    b.set((state) => state + 1)
    b.set((state) => state + 1)
    b.set((state) => state + 1)

    expect(callback).toBeCalledTimes(1)
    expect(callback).toBeCalledWith(0, undefined)

    a.set((state) => state + 1)

    expect(callback).toBeCalledTimes(2)
    expect(callback).toBeCalledWith(3, 0)
  })

  it("Uses default check when passed undefined as an equalityCheck", () => {
    let store = new MutStore({ test: 0 })
    let callback = jest.fn(() => console.log("test"))

    select(() => store.state.test, callback, undefined)

    expect(callback).toBeCalledTimes(1)

    store.set((state) => {
      state.test = 1
    })

    expect(callback).toBeCalledTimes(2)
  })

  it("Respects equality functions", () => {
    let callback = jest.fn()
    let state = { count: 0, likes: 0, users: [{ id: 1 }, { id: 2 }] }

    let store = new MutStore(state)

    const firstListener = select(
      () => [store.state.count, store.state.likes],
      callback,
      shallowEqualArray
    )

    store.set((state) => {
      state.count++
      state.likes = 10
    })
    store.set((state) => {
      state.count = 1
      state.likes = 10
    })

    firstListener()
    expect(state.count).toEqual(1)
    expect(callback).toBeCalledTimes(2)
    expect(callback).toBeCalledWith([0, 0], undefined)
    expect(callback).toBeCalledWith([1, 10], [0, 0])

    const secondCallback = jest.fn()

    select(
      () => store.state.users.map((user) => user.id),
      secondCallback,
      (a, b) => shallowEqualArray(a, b)
    )

    store.set((state) => {
      state.users = []
    })

    // this update is ignored
    store.set((state) => {
      state.users = []
    })

    store.set((state) => {
      state.users = [{ id: 1 }, { id: 2 }]
    })

    store.set((state) => {
      state.users = [{ id: 1 }, { id: 2 }]
    })

    // select is called immediately
    expect(secondCallback).toBeCalledTimes(3)
    expect(secondCallback).toBeCalledWith([1, 2], undefined)
    expect(secondCallback).toBeCalledWith([], [1, 2])
  })

  it("only flushes once when nesting flush calls", () => {
    let callback = jest.fn()

    let store = new MutStore(0)

    const listener = select(() => store.state, callback)

    expect(callback).toBeCalledTimes(1)
    expect(callback).toBeCalledWith(0, undefined)

    flush(() => {
      store.set((state) => ++state)
      store.set((state) => ++state)
      store.set((state) => ++state)
      store.set((state) => ++state)
    })

    expect(store.state).toEqual(4)
    expect(callback).toBeCalledTimes(2)
    listener()
  })

  it("can subscribe to two stores", () => {
    const a = new MutStore(0)
    const b = new MutStore(0)

    const callback = jest.fn()

    select(() => a.state + b.state, callback)

    a.set((s) => s + 1)
    b.set((s) => s + 1)

    expect(callback).toBeCalledTimes(3)
    expect(callback).toBeCalledWith(0, undefined)
    expect(callback).toBeCalledWith(1, 0)
    expect(callback).toBeCalledWith(2, 1)
  })
})

describe("Store", () => {
  it("Immediately calls handler when created", () => {
    let callback = jest.fn((arg) => {})

    let store = new Store({
      count: 0,
    })

    select(() => store.state.count, callback)

    expect(callback).toBeCalledTimes(1)
    expect(callback).toBeCalledWith(0, undefined)
  })

  it("updates when changed", () => {
    let callback = jest.fn()

    let store = new Store({
      count: 0,
    })

    let unsub = select(() => store.state.count, callback)

    store.set((state) => {
      state.count++
    })

    expect(store.state).toEqual({ count: 1 })
    expect(callback).toBeCalledWith(1, 0)
    expect(callback).toBeCalledTimes(2)
  })

  it("Cancels subscriptions", () => {
    let callback = jest.fn()

    let store = new Store({
      count: 0,
    })

    let unsub = select(() => store.state.count, callback)

    store.set((state) => {
      state.count++
      state.count++
    })

    unsub()

    store.set((state) => {
      state.count++
    })

    expect(callback).toBeCalledTimes(2)
    expect(callback).toBeCalledWith(0, undefined)
    expect(callback).toBeCalledWith(2, 0)
  })
  it(`Doesn't mutate values`, () => {
    let state = { count: 0 }

    let store = new Store(state)

    store.set((state) => {
      state.count++
    })

    expect(state.count).toEqual(0)
  })
  it("only flushes once when nesting flush calls", () => {
    let callback = jest.fn()
    let state = { count: 0, likes: 0, users: [{ id: 1 }, { id: 2 }] }

    let store = new Store(state)

    select(() => store.state, callback)
    expect(callback).toBeCalledTimes(1)

    flush(() => {
      store.set((state) => {
        state.likes++
      })

      store.set((state) => {
        state.count++
      })

      store.set((state) => {
        state.users.push({ id: 3 })
      })
    })

    expect(store.state).toEqual({
      count: 1,
      likes: 1,
      users: [{ id: 1 }, { id: 2 }, { id: 3 }],
    })
    expect(callback).toBeCalledTimes(2)
  })

  it("changes in a running flush should trigger a new update", () => {
    let callback = jest.fn((val) => {})

    let state = { count: 0 }

    let store = new Store(state)

    select(() => store.state.count, callback)

    let divisibleByTwoCallback = jest.fn((divisibleByTwo) => {
      if (divisibleByTwo) {
        store.set((state) => {
          state.count++
        })
      }
    })

    let selector = jest.fn(() =>
      store.state.count % 2 === 0 && store.state.count !== 0
        ? store.state.count
        : false
    )

    select(selector, divisibleByTwoCallback)

    expect(callback).toBeCalledTimes(1)

    // count set to one
    store.set((state) => {
      state.count++
    })
    // count set to two
    store.set((state) => {
      state.count++
    })
    // divByTwo runs sets to three

    expect(store.state).toEqual({
      count: 3,
    })
    expect(callback).toBeCalledTimes(4)

    flush(() => {
      store.set((state) => {
        state.count++
      })
      expect(callback).toBeCalledTimes(4)

      store.set((state) => {
        state.count++
        state.count++
      })
      expect(callback).toBeCalledTimes(4)
    })

    expect(store.state).toEqual({
      count: 7,
    })
    expect(callback).toBeCalledTimes(6)
  })

  it("runs updates when returning undefined", () => {
    let callback = jest.fn()
    let state: any = { value: {} }

    let store = new Store(state)

    select(
      () => store.state.value,
      (a, b) => callback(a, b)
    )
    expect(callback).toBeCalledTimes(1)

    store.set((state: any) => {
      state.value = undefined
    })

    expect(store.state).toEqual({ value: undefined })
    expect(callback).toBeCalledTimes(2)
    expect(callback).toHaveBeenNthCalledWith(1, state.value, undefined)
    expect(callback).toHaveBeenNthCalledWith(2, undefined, state.value)
  })
})
