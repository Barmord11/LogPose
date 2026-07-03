import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// vitest doesn't auto-run Testing Library's cleanup between tests the
// way Jest's environment does, so without this, DOM nodes from one
// test's render() pile up and leak into the next test's queries.
afterEach(() => {
  cleanup()
})
