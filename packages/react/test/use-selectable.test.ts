import { useSelectable } from "../src/use-selectable"
import { MutableSelectable } from "../../core/src/mutable-selectable"
import { Selectable } from "../../core/src/selectable"
import { act, renderHook } from "@testing-library/react-hooks"
import { render, waitFor } from "@testing-library/react"
import { createElement } from "react"
import { shallowEqualArray } from "../../core/src"

describe(`useSelectable`, () => {
  it("subscribes and unsubscribes from a mutableStore", () => {
    const initialState = { test: undefined }
    const store = new MutableSelectable<{ test?: number }>(initialState)
    const selector = jest.fn((state) => state.test)

    const { result, unmount } = renderHook(() => useSelectable(store, selector))

    expect(selector).toBeCalledTimes(4)

    expect(result.current).toBe(undefined)

    act(() => {
      store.set((state) => {
        state.test = 1
      })
    })

    expect(selector).toBeCalledTimes(7)
    expect(result.current).toBe(1)
    expect(store.state).toBe(initialState)

    unmount()
    act(() => {
      store.set((state) => {
        state.test = 2
      })
    })

    expect(selector).toBeCalledTimes(7)
  })

  it("subscribes and unsubscribes from a immutable store", () => {
    const initialState = { test: undefined }
    const store = new Selectable<{ test?: number }>(initialState)
    const selector = jest.fn((state) => state.test)

    const { result, unmount } = renderHook(() => useSelectable(store, selector))

    expect(selector).toBeCalledTimes(4)

    expect(result.current).toBe(undefined)

    act(() => {
      store.set((state) => {
        state.test = 1
      })
    })

    expect(selector).toBeCalledTimes(7)
    expect(result.current).toBe(1)
    expect(store.state).not.toBe(initialState)

    unmount()
    act(() => {
      store.set((state) => {
        state.test = 2
      })
    })

    expect(selector).toBeCalledTimes(7)
  })

  it("renders a component with updated state", () => {
    const store = new Selectable({ test: 0 })
    const selector = jest.fn((state) => state.test)
    const ExampleComponent = () => {
      const state = useSelectable(store, selector)

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

    expect(selector).toBeCalledTimes(7)
    expect(container.querySelector("div")?.textContent).toBe("1")

    unmount()

    act(() => {
      store.set((state) => {
        state.test = 2
      })
    })

    expect(selector).toBeCalledTimes(7)
  })

  it("respects equality functions", () => {
    const store = new Selectable({ test: [] as { id: number }[] })
    const selector = jest.fn((state) => state.test.map((user: any) => user.id))

    const onRender = jest.fn()

    const ExampleComponent = () => {
      const state = useSelectable(store, selector, shallowEqualArray)
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

    expect(selector).toBeCalledTimes(5)
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

    expect(selector).toBeCalledTimes(8)
  })

  it("Picks out the right value", () => {
    const store = new Selectable({ test: { value: 0 } })

    const ExampleComponent = () => {
      const state = useSelectable(store, (state) => state.test.value)

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
