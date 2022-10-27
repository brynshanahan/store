export function strictEqual<T1 extends any, T2 extends any>(a: T1, b: T2) {
  return a === b
}

export function shallowEqualArray<
  Arr extends ArrayLike<any>,
  Arr2 extends ArrayLike<any>
>(a: Arr, b: Arr2, checkFrom = 0) {
  if (!a && !b) return true
  if (!a !== !b) return false
  if (a.length !== b.length) return false
  for (let i = checkFrom; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

export function shallowEqual<
  T1 extends { [k: string]: any },
  T2 extends { [k: string]: any }
>(a?: T1, b?: T2) {
  if (!!a !== !!b) return false
  if (!a || !b) return a === b

  let aKeys = a ? Object.keys(a) : []
  let bKeys = b ? Object.keys(b) : []

  if (aKeys.length !== bKeys.length) return false

  for (let key of aKeys) {
    if (a[key] !== b[key]) {
      return false
    }
  }

  return true
}

export function deepEqual<
  T1 extends { [k: string]: any },
  T2 extends { [k: string]: any }
>(a?: T1, b?: T2) {
  if (!!a !== !!b) return false
  if (!a || !b) return a === b

  let aKeys = a ? Object.keys(a) : []
  let bKeys = b ? Object.keys(b) : []

  if (aKeys.length !== bKeys.length) return false

  for (let key of aKeys) {
    if (typeof a[key] === "object" && typeof b[key] === "object") {
      if (!deepEqual(a[key], b[key])) {
        return false
      }
    } else {
      if (a[key] !== b[key]) {
        return false
      }
    }
  }

  return true
}
