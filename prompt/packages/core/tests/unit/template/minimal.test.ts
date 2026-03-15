import { describe, it, expect } from 'vitest';
import { Mustache, render } from '../../../src/services/template/minimal';

describe('Minimal Template Solution (Mustache)', () => {
  it('should work with direct Mustache usage', () => {
    const result = Mustache.render('Hello {{name}}!', { name: 'World' });
    expect(result).toBe('Hello World!');
  });

  it('should work with convenience render function', () => {
    const result = render('Hello {{name}}!', { name: 'World' });
    expect(result).toBe('Hello World!');
  });

  it('should work with conditional rendering', () => {
    // Mustache uses {{#variable}} for truthy conditions
    let result = Mustache.render('{{#show}}Hello {{name}}!{{/show}}', { show: true, name: 'World' });
    expect(result).toBe('Hello World!');

    // Test falsy condition
    result = Mustache.render('{{#show}}Hello {{name}}!{{/show}}', { show: false, name: 'World' });
    expect(result).toBe('');
  });

  it('should work with inverted conditions', () => {
    // Mustache uses {{^variable}} for falsy conditions
    const result = Mustache.render('{{^show}}No greeting{{/show}}{{#show}}Hello {{name}}!{{/show}}', { show: false, name: 'World' });
    expect(result).toBe('No greeting');
  });

  it('should work with loops', () => {
    const result = Mustache.render('{{#items}}{{.}} {{/items}}', { items: ['a', 'b', 'c'] });
    expect(result).toBe('a b c ');
  });

  it('should work with object loops', () => {
    const result = Mustache.render('{{#users}}{{name}}: {{age}} {{/users}}', { 
      users: [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 }
      ]
    });
    expect(result).toBe('Alice: 25 Bob: 30 ');
  });

  it('should handle missing variables gracefully', () => {
    const result = Mustache.render('Hello {{name}}, {{missing}}!', { name: 'World' });
    expect(result).toBe('Hello World, !');
  });

  it('should support nested object properties', () => {
    const result = Mustache.render('{{user.name}} lives in {{user.address.city}}', { 
      user: { 
        name: 'Alice', 
        address: { city: 'New York' }
      }
    });
    expect(result).toBe('Alice lives in New York');
  });
});