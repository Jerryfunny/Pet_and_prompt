import { describe, it, expect } from 'vitest';
import { TemplateProcessor } from '../../../src/services/template/processor';
import type { ToolDefinition } from '../../../src/services/prompt/types';

describe('TemplateProcessor Tool Context Injection', () => {
  const sampleTools: ToolDefinition[] = [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get current weather information for a specific location',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'The location to get weather for'
            },
            unit: {
              type: 'string',
              enum: ['celsius', 'fahrenheit'],
              default: 'celsius'
            }
          },
          required: ['location']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'calculate',
        description: 'Perform basic mathematical calculations',
        parameters: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description: 'Mathematical expression to evaluate'
            }
          },
          required: ['expression']
        }
      }
    }
  ];

  describe('formatToolsAsText', () => {
    it('should format single tool correctly', () => {
      const singleTool = [sampleTools[0]];
      const result = TemplateProcessor.formatToolsAsText(singleTool);
      
      expect(result).toContain('工具名称: get_weather');
      expect(result).toContain('描述: Get current weather information for a specific location');
      expect(result).toContain('参数结构:');
      expect(result).toContain('"location"');
      expect(result).toContain('"unit"');
    });

    it('should format multiple tools correctly', () => {
      const result = TemplateProcessor.formatToolsAsText(sampleTools);
      
      expect(result).toContain('工具名称: get_weather');
      expect(result).toContain('工具名称: calculate');
      expect(result).toContain('Get current weather information');
      expect(result).toContain('Perform basic mathematical calculations');
      
      // Should have proper separation between tools
      const toolSections = result.split('\n\n');
      expect(toolSections.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle empty tools array', () => {
      const result = TemplateProcessor.formatToolsAsText([]);
      expect(result).toBe('');
    });

    it('should handle undefined tools', () => {
      const result = TemplateProcessor.formatToolsAsText(undefined as any);
      expect(result).toBe('');
    });

    it('should handle tools without description', () => {
      const toolWithoutDesc: ToolDefinition[] = [{
        type: 'function',
        function: {
          name: 'simple_tool',
          parameters: {
            type: 'object',
            properties: {
              input: { type: 'string' }
            }
          }
        }
      }];

      const result = TemplateProcessor.formatToolsAsText(toolWithoutDesc);
      expect(result).toContain('工具名称: simple_tool');
      expect(result).not.toContain('描述:');
      expect(result).toContain('参数结构:');
    });

    it('should handle tools without parameters', () => {
      const toolWithoutParams: ToolDefinition[] = [{
        type: 'function',
        function: {
          name: 'paramless_tool',
          description: 'A tool without parameters'
        }
      }];

      const result = TemplateProcessor.formatToolsAsText(toolWithoutParams);
      expect(result).toContain('工具名称: paramless_tool');
      expect(result).toContain('描述: A tool without parameters');
      expect(result).not.toContain('参数结构:');
    });
  });

  describe('Template Context Integration', () => {
    it('should include toolsContext in template context when tools are provided', () => {
      const template = {
        id: 'test-template',
        name: 'Test Template',
        content: [
          {
            role: 'system' as const,
            content: 'You are an assistant. Available tools: {{toolsContext}}'
          },
          {
            role: 'user' as const,
            content: '{{originalPrompt}}'
          }
        ]
      };

      const context = {
        originalPrompt: 'Test prompt',
        tools: sampleTools,
        toolsContext: TemplateProcessor.formatToolsAsText(sampleTools)
      };

      const messages = TemplateProcessor.processTemplate(template, context);
      
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toContain('工具名称: get_weather');
      expect(messages[0].content).toContain('工具名称: calculate');
      expect(messages[1].content).toBe('Test prompt');
    });

    it('should handle template context without tools', () => {
      const template = {
        id: 'test-template',
        name: 'Test Template',
        content: [
          {
            role: 'system' as const,
            content: 'You are an assistant. {{#toolsContext}}Available tools: {{toolsContext}}{{/toolsContext}}'
          },
          {
            role: 'user' as const,
            content: '{{originalPrompt}}'
          }
        ]
      };

      const context = {
        originalPrompt: 'Test prompt without tools'
      };

      const messages = TemplateProcessor.processTemplate(template, context);
      
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('You are an assistant. ');
      expect(messages[1].content).toBe('Test prompt without tools');
    });
  });
});