import { tools } from '../../src/tools/index.js'

describe('tool registration', () => {
  it('exports exactly 7 tools', () => {
    expect(tools).toHaveLength(7)
  })

  it('each tool has a unique name', () => {
    const names = tools.map(t => t.definition.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('each tool has a non-empty description', () => {
    for (const tool of tools) {
      expect(typeof tool.definition.description).toBe('string')
      expect(tool.definition.description!.length).toBeGreaterThan(0)
    }
  })

  it('each tool has a valid inputSchema with type object', () => {
    for (const tool of tools) {
      expect(tool.definition.inputSchema).toBeDefined()
      expect(tool.definition.inputSchema.type).toBe('object')
    }
  })

  it('each tool has a handler function', () => {
    for (const tool of tools) {
      expect(typeof tool.handler).toBe('function')
    }
  })

  it('contains all expected tool names', () => {
    const names = tools.map(t => t.definition.name)
    expect(names).toContain('get_aws_cost_and_usage')
    expect(names).toContain('get_cost_by_service')
    expect(names).toContain('get_cost_by_tag')
    expect(names).toContain('get_cost_forecast')
    expect(names).toContain('get_cost_anomalies')
    expect(names).toContain('get_cost_comparison')
    expect(names).toContain('get_rightsizing_recommendations')
  })
})
