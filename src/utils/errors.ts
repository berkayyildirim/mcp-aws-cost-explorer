export class AwsCostExplorerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: string
  ) {
    super(message)
    this.name = 'AwsCostExplorerError'
  }
}
