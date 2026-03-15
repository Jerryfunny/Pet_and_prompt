import { describe, it, expect, beforeAll } from 'vitest'
import { GeminiAdapter } from '../../../src/services/llm/adapters/gemini-adapter'
import type { TextModelConfig, Message, ToolDefinition, ToolCall } from '../../../src/services/llm/types'
import dotenv from 'dotenv'
import path from 'path'

// 加载环境变量
beforeAll(() => {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
  console.log('环境变量检查:')
  console.log('- RUN_REAL_API:', process.env.RUN_REAL_API)
  console.log('- VITE_GEMINI_API_KEY:', process.env.VITE_GEMINI_API_KEY ? '已设置' : '未设置')
})

const RUN_REAL_API = process.env.RUN_REAL_API === '1'
const apiKey = process.env.VITE_GEMINI_API_KEY

console.log('测试配置:')
console.log('- RUN_REAL_API:', RUN_REAL_API)
console.log('- apiKey exists:', !!apiKey)

describe.skipIf(!RUN_REAL_API || !apiKey)('Gemini New SDK Integration Tests', () => {
  let adapter: GeminiAdapter

  /**
   * 辅助函数：创建测试配置
   * 从 adapter 自动获取模型，避免硬编码
   */
  const createConfig = (paramOverrides: Record<string, any> = {}): TextModelConfig => {
    const models = adapter.getModels()
    if (models.length === 0) {
      throw new Error('No models available from Gemini adapter')
    }

    return {
      id: 'gemini-test',
      name: 'Gemini Test',
      enabled: true,
      providerMeta: adapter.getProvider(),
      modelMeta: models[0], // 使用第一个可用模型
      connectionConfig: {
        apiKey: apiKey!
        // 不覆盖 baseURL，使用 adapter 的默认值
      },
      paramOverrides
    }
  }

  beforeAll(() => {
    adapter = new GeminiAdapter()
  })

  describe('Dynamic Model List (models.list API)', () => {
    it('should fetch models dynamically using new SDK', async () => {
      const config = createConfig()
      const models = await adapter.getModelsAsync(config)

      expect(Array.isArray(models)).toBe(true)
      expect(models.length).toBeGreaterThan(0)

      console.log(`✓ 获取到 ${models.length} 个模型`)
      console.log('前5个模型:', models.slice(0, 5).map(m => m.id))
    }, 30000)
  })

  describe('Basic Text Generation', () => {
    it('应该能够发送简单的单轮对话', async () => {
      const config = createConfig()
      const messages: Message[] = [
        { role: 'user', content: '请用一句话介绍你自己' }
      ]

      const response = await adapter.sendMessage(messages, config)

      expect(response).toBeDefined()
      expect(response.content).toBeDefined()
      expect(typeof response.content).toBe('string')
      expect(response.content.length).toBeGreaterThan(0)

      console.log('✓ 响应内容:', response.content.substring(0, 100) + '...')
    }, 30000)

    it('应该能够处理多轮对话', async () => {
      const config = createConfig()
      const messages: Message[] = [
        { role: 'user', content: '我有2只狗' },
        { role: 'assistant', content: '太好了！狗是很忠诚的宠物。' },
        { role: 'user', content: '我家里有多少只爪子？' }
      ]

      const response = await adapter.sendMessage(messages, config)

      expect(response).toBeDefined()
      expect(response.content).toBeDefined()
      expect(typeof response.content).toBe('string')
      expect(response.content.length).toBeGreaterThan(0)

      console.log('✓ 多轮对话响应:', response.content)
    }, 30000)
  })

  describe('System Instructions', () => {
    it('应该能够处理系统指令', async () => {
      const config = createConfig()
      const messages: Message[] = [
        { role: 'system', content: '你是一个数学老师，回答要简洁专业' },
        { role: 'user', content: '1+1等于几？' }
      ]

      const response = await adapter.sendMessage(messages, config)

      expect(response).toBeDefined()
      expect(response.content).toBeDefined()
      expect(response.content).toContain('2')

      console.log('✓ 系统指令响应:', response.content)
    }, 30000)
  })

  describe('Streaming', () => {
    it('应该能够处理流式响应', async () => {
      const config = createConfig()
      const messages: Message[] = [
        { role: 'user', content: '请用3句话介绍人工智能' }
      ]

      const tokens: string[] = []
      let completed = false
      let fullResponse = ''

      await adapter.sendMessageStream(messages, config, {
        onToken: (token) => {
          tokens.push(token)
        },
        onComplete: (response) => {
          completed = true
          if (response) {
            fullResponse = response.content
          }
        },
        onError: (error) => {
          throw error
        }
      })

      expect(tokens.length).toBeGreaterThan(0)
      expect(completed).toBe(true)
      expect(fullResponse.length).toBeGreaterThan(0)

      console.log('✓ 收到', tokens.length, '个token')
      console.log('✓ 完整响应:', fullResponse.substring(0, 100) + '...')
    }, 30000)
  })

  describe('Parameters', () => {
    it('应该能够使用自定义参数', async () => {
      const config = createConfig({
        temperature: 0.1,
        maxOutputTokens: 50
      })

      const messages: Message[] = [
        { role: 'user', content: '说一个数字' }
      ]

      const response = await adapter.sendMessage(messages, config)

      expect(response).toBeDefined()
      expect(response.content).toBeDefined()
      // 由于 maxOutputTokens 限制，响应应该较短
      expect(response.content.length).toBeLessThan(200)

      console.log('✓ 参数化响应:', response.content)
    }, 30000)
  })

  describe('Tool Calling (Function Calling)', () => {
    it('应该能够处理工具调用', async () => {
      const config = createConfig()
      const messages: Message[] = [
        { role: 'user', content: '北京今天的天气怎么样？' }
      ]

      const tools: ToolDefinition[] = [
        {
          type: 'function',
          function: {
            name: 'getWeather',
            description: '获取指定城市的天气信息',
            parameters: {
              type: 'object',
              properties: {
                city: {
                  type: 'string',
                  description: '城市名称，如"北京"、"上海"'
                }
              },
              required: ['city']
            }
          }
        }
      ]

      const toolCalls: ToolCall[] = []
      const tokens: string[] = []
      let completed = false

      await adapter.sendMessageStreamWithTools(messages, config, tools, {
        onToken: (token) => {
          tokens.push(token)
        },
        onToolCall: (toolCall) => {
          toolCalls.push(toolCall)
          console.log('✓ 收到工具调用:', toolCall.function.name)
          console.log('  参数:', toolCall.function.arguments)
        },
        onComplete: (response) => {
          completed = true
          console.log('✓ 完成工具调用响应')
        },
        onError: (error) => {
          throw error
        }
      })

      expect(completed).toBe(true)

      // 验证是否收到了工具调用
      if (toolCalls.length > 0) {
        expect(toolCalls[0].type).toBe('function')
        expect(toolCalls[0].function.name).toBe('getWeather')

        const args = JSON.parse(toolCalls[0].function.arguments)
        expect(args.city).toBeDefined()
        console.log('✓ 工具调用验证成功:', args)
      } else {
        console.log('⚠️ 模型没有返回工具调用（可能直接回答了问题）')
      }
    }, 30000)
  })

  describe('Thinking/Reasoning', () => {
    it('应该能够捕获思考过程', async () => {
      const config = createConfig({
        thinkingBudget: 2048,
        includeThoughts: true,
        temperature: 1.0
      })

      const messages: Message[] = [
        {
          role: 'user',
          content: '请分析一下这个数学问题：如果一个数字序列是 2, 4, 8, 16，下一个数字是什么？请详细解释你的推理过程。'
        }
      ]

      const response = await adapter.sendMessage(messages, config)

      expect(response).toBeDefined()
      expect(response.content).toBeDefined()
      expect(response.content.length).toBeGreaterThan(0)

      // 检查是否包含推理内容
      if (response.reasoning) {
        console.log('✓ 捕获到思考过程:')
        console.log(response.reasoning.substring(0, 200) + '...')
        expect(typeof response.reasoning).toBe('string')
        expect(response.reasoning.length).toBeGreaterThan(0)
      } else {
        console.log('⚠️ 没有捕获到思考内容（可能模型不支持或未启用）')
      }

      console.log('✓ 最终回答:', response.content.substring(0, 150) + '...')
    }, 30000)

    it('应该能够处理流式思考过程', async () => {
      const config = createConfig({
        thinkingBudget: 2048,
        includeThoughts: true
      })

      const messages: Message[] = [
        {
          role: 'user',
          content: '分析这个逻辑问题：所有的猫都有尾巴，小花是一只猫，那么小花有尾巴吗？请说明推理步骤。'
        }
      ]

      const tokens: string[] = []
      const reasoningTokens: string[] = []
      let completed = false
      let fullResponse = ''
      let fullReasoning = ''

      await adapter.sendMessageStream(messages, config, {
        onToken: (token) => {
          tokens.push(token)
        },
        onReasoningToken: (token) => {
          reasoningTokens.push(token)
          console.log('✓ 思考token:', token.substring(0, 50))
        },
        onComplete: (response) => {
          completed = true
          if (response) {
            fullResponse = response.content
            fullReasoning = response.reasoning || ''
          }
        },
        onError: (error) => {
          throw error
        }
      })

      expect(completed).toBe(true)
      expect(tokens.length).toBeGreaterThan(0)

      if (reasoningTokens.length > 0) {
        console.log('✓ 收到', reasoningTokens.length, '个思考token')
        console.log('✓ 完整思考过程:', fullReasoning.substring(0, 200) + '...')
        expect(fullReasoning.length).toBeGreaterThan(0)
      } else {
        console.log('⚠️ 没有收到思考token（可能模型不支持或未启用）')
      }

      console.log('✓ 完整回答:', fullResponse.substring(0, 150) + '...')
    }, 30000)
  })
})
