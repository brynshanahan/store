import React from "react"
import "@testing-library/jest-dom"
import { useSelect, Store, MutStore, flush, shallowEqualArray } from "../src"
import { act, renderHook } from "@testing-library/react-hooks"
import { render, screen } from "@testing-library/react"
import { createElement } from "react"

describe(`useSelect`, () => {
  it("subscribes and unsubscribes from a mutableStore", () => {
    const initialState = { test: undefined }
    const store = new MutStore<{ test?: number }>(initialState)
    const selector = jest.fn(() => store.state.test)

    const { result, unmount } = renderHook(() => useSelect(selector))

    expect(result.current).toBe(undefined)

    act(() => {
      store.set((state) => {
        state.test = 1
      })
    })

    expect(selector).toBeCalledTimes(5)
    expect(result.current).toBe(1)
    expect(store.state).toBe(initialState)

    unmount()
    act(() => {
      store.set((state) => {
        state.test = 2
      })
    })

    expect(selector).toBeCalledTimes(5)
  })

  it("can subscribe to multiple stores", () => {
    const a = new MutStore(0)
    const b = new Store(0)

    const selector = jest.fn(() => a.state + b.state)

    const Comp = () => {
      const result = useSelect(selector)
      return createElement("div", {}, result)
    }

    render(<Comp />)

    act(() => {
      a.set((state) => ++state)
    })

    expect(screen.getByText("1")).toBeInTheDocument()
    expect(selector).toBeCalledTimes(7)

    act(() => {
      b.set((state) => ++state)
    })

    expect(selector).toBeCalledTimes(9)
    expect(screen.getByText("2")).toBeInTheDocument()

    act(() => {
      flush(() => {
        a.set((state) => ++state)
        b.set((state) => ++state)
      })
    })

    expect(screen.getByText("4")).toBeInTheDocument()
  })

  it("can change which store it subscribes to", () => {
    const a = new MutStore(true)
    const b = new Store("b")
    const c = new Store("c")
    const callback = jest.fn(() => {
      if (a.state) return b.state
      else return c.state
    })

    const Comp = () => {
      const value = useSelect(callback)
      return createElement("div", {}, value)
    }

    render(<Comp />)

    expect(screen.queryByText("b")).toBeInTheDocument()

    a.set(false)

    expect(screen.queryByText("c")).toBeInTheDocument()

    const prevCalls = callback.mock.calls.length
    // Because the callback did not enter the if (a.state) branch, it should not have subscribed to b
    b.set("b2")
    expect(callback).toBeCalledTimes(prevCalls)

    c.set("d")
    expect(c.state).toBe("d")

    expect(screen.queryByText("d")).toBeInTheDocument()
  })

  it("subscribes and unsubscribes from a immutable store", () => {
    const initialState = { test: undefined }
    const store = new Store<{ test?: number }>(initialState)
    const selector = jest.fn(() => store.state.test)

    const { result, unmount } = renderHook(() => useSelect(selector))

    expect(result.current).toBe(undefined)

    act(() => {
      store.set((state) => {
        state.test = 1
      })
    })

    expect(result.current).toBe(1)
    expect(store.state).not.toBe(initialState)

    unmount()
    store.set((state) => {
      state.test = 2
    })

    expect(selector).not.toReturnWith(2)
  })

  it("renders a component with updated state", () => {
    const store = new Store({ test: 0 })
    const selector = jest.fn(() => store.state.test)
    const ExampleComponent = () => {
      const state = useSelect(selector)

      return createElement("div", {}, state)
    }

    const { container, unmount } = render(createElement(ExampleComponent, {}))

    expect(container).toBeTruthy()
    expect(container.querySelector("div")?.textContent).toBe("0")

    act(() => {
      store.set((state) => {
        state.test = 1
      })
    })

    expect(screen.queryByText("1")).toBeInTheDocument()

    unmount()
    act(() => {})

    act(() => {
      store.set((state) => {
        state.test = 2
      })
    })

    expect(selector).not.toReturnWith(2)

    expect(screen.queryByText("2")).not.toBeInTheDocument()
  })

  it("respects equality functions", () => {
    const store = new Store({ test: [] as { id: number }[] })
    const selector = jest.fn(() => store.state.test.map((user) => user.id))

    const onRender = jest.fn()

    const ExampleComponent = () => {
      const state = useSelect(selector, shallowEqualArray)
      onRender(state)

      return createElement("div", {}, state[0])
    }

    const { container, unmount } = render(createElement(ExampleComponent, {}))

    expect(container).toBeTruthy()
    expect(container.querySelector("div")?.textContent).toBe("")

    expect(onRender).toBeCalledTimes(1)

    act(() => {
      store.set((state) => {
        state.test = []
      })
    })

    expect(onRender).toBeCalledTimes(1)

    expect(selector).toBeCalledTimes(4)
    expect(container.querySelector("div")?.textContent).toBe("")

    act(() => {
      store.set((state) => {
        state.test = [{ id: 1 }, { id: 2 }]
      })
    })

    expect(onRender).toBeCalledTimes(2)

    expect(selector).toBeCalledTimes(8)
    expect(container.querySelector("div")?.textContent).toBe("1")

    unmount()

    act(() => {
      store.set((state) => {
        state.test = [{ id: 2 }]
      })
    })

    expect(store.state.test[0].id).toBe(2)
    expect(selector).toBeCalledTimes(8)
  })

  it("Picks out the right value", () => {
    const store = new Store({ test: { value: 0 } })

    const ExampleComponent = () => {
      const state = useSelect(() => store.state.test.value)

      return createElement("div", {}, state)
    }

    const { container, unmount } = render(createElement(ExampleComponent, {}))

    expect(container).toBeTruthy()
    expect(container.querySelector("div")?.textContent).toBe("0")

    act(() => {
      store.set((state) => {
        state.test.value++
      })
    })

    expect(container.querySelector("div")?.textContent).toBe("1")

    act(() => {
      store.set((state) => {
        state.test.value++
      })
    })

    expect(container.querySelector("div")?.textContent).toBe("2")

    act(() => {
      store.set((state) => {
        state.test.value = 3
      })
    })

    expect(container.querySelector("div")?.textContent).toBe("3")
  })
})
