import { jest } from '@jest/globals'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockSend = jest.fn<(...args: any[]) => any>()

jest.unstable_mockModule('../../src/client.js', () => ({
  getCostExplorerClient: () => ({
    send: mockSend,
  }),
}))

export function resetMocks() {
  mockSend.mockReset()
}
