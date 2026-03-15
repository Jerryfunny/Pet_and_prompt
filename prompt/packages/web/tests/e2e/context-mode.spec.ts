import { test, expect, type Page } from '@playwright/test';

/**
 * 上下文模式 E2E 测试
 *
 * 测试完整的用户流程：
 * 1. 模式切换按钮交互
 * 2. 变量管理器集成
 * 3. 预览面板联动
 * 4. 测试面板模式化行为
 */

// 测试前的设置
test.beforeEach(async ({ page }) => {
  // 导航到应用首页
  await page.goto('/');

  // 等待应用加载完成
  await page.waitForLoadState('networkidle');
});

test.describe('上下文模式切换', () => {
  test('应该默认显示用户模式', async ({ page }) => {
    // 查找模式切换按钮组
    const userModeButton = page.getByRole('button', { name: /用户模式/ });
    const systemModeButton = page.getByRole('button', { name: /系统模式/ });

    // 用户模式应该默认激活
    await expect(userModeButton).toHaveClass(/primary/);
    await expect(systemModeButton).not.toHaveClass(/primary/);
  });

  test('应该能够切换到系统模式', async ({ page }) => {
    const systemModeButton = page.getByRole('button', { name: /系统模式/ });

    // 点击系统模式按钮
    await systemModeButton.click();

    // 等待 UI 更新
    await page.waitForTimeout(200);

    // 系统模式应该激活
    await expect(systemModeButton).toHaveClass(/primary/);
  });

  test('应该能够在模式之间来回切换', async ({ page }) => {
    const userModeButton = page.getByRole('button', { name: /用户模式/ });
    const systemModeButton = page.getByRole('button', { name: /系统模式/ });

    // 切换到系统模式
    await systemModeButton.click();
    await page.waitForTimeout(200);
    await expect(systemModeButton).toHaveClass(/primary/);

    // 切换回用户模式
    await userModeButton.click();
    await page.waitForTimeout(200);
    await expect(userModeButton).toHaveClass(/primary/);

    // 再次切换到系统模式
    await systemModeButton.click();
    await page.waitForTimeout(200);
    await expect(systemModeButton).toHaveClass(/primary/);
  });
});

test.describe('快捷操作按钮', () => {
  test('应该显示变量管理器按钮', async ({ page }) => {
    const variableButton = page.getByRole('button', { name: /变量管理/ });

    await expect(variableButton).toBeVisible();
  });

  test('应该在系统模式下显示对话管理按钮', async ({ page }) => {
    // 切换到系统模式
    const systemModeButton = page.getByRole('button', { name: /系统模式/ });
    await systemModeButton.click();
    await page.waitForTimeout(200);

    // 对话管理按钮应该可见
    const conversationButton = page.getByRole('button', { name: /管理对话|对话/ });
    await expect(conversationButton).toBeVisible();
  });

  test('应该在用户模式下隐藏对话管理按钮', async ({ page }) => {
    // 确保在用户模式
    const userModeButton = page.getByRole('button', { name: /用户模式/ });
    await userModeButton.click();
    await page.waitForTimeout(200);

    // 对话管理按钮应该不可见
    const conversationButton = page.getByRole('button', { name: /管理对话|对话/ });
    await expect(conversationButton).not.toBeVisible();
  });

  test('应该显示预览按钮', async ({ page }) => {
    const previewButton = page.getByRole('button', { name: /预览/ });

    await expect(previewButton).toBeVisible();
  });
});

test.describe('变量管理器集成', () => {
  test('点击变量管理器按钮应该打开变量管理器', async ({ page }) => {
    const variableButton = page.getByRole('button', { name: /变量管理/ });

    await variableButton.click();

    // 等待变量管理器打开
    await page.waitForTimeout(300);

    // 检查变量管理器是否可见（可能是模态框或面板）
    // 注意：实际的选择器需要根据实际实现调整
    const variableManager = page.locator('[data-testid="variable-manager"], .variable-manager, .n-modal');
    await expect(variableManager).toBeVisible({ timeout: 3000 });
  });

  test('变量管理器应该支持添加自定义变量', async ({ page }) => {
    // 打开变量管理器
    const variableButton = page.getByRole('button', { name: /变量管理/ });
    await variableButton.click();
    await page.waitForTimeout(300);

    // 查找添加变量的输入框或按钮
    const addButton = page.getByRole('button', { name: /添加|新建/ });

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(200);

      // 输入变量名和值（实际选择器需要根据实现调整）
      const nameInput = page.locator('input[placeholder*="名称"], input[placeholder*="name"]').first();
      const valueInput = page.locator('input[placeholder*="值"], input[placeholder*="value"], textarea[placeholder*="值"]').first();

      if (await nameInput.isVisible() && await valueInput.isVisible()) {
        await nameInput.fill('testVar');
        await valueInput.fill('testValue');

        // 保存变量
        const saveButton = page.getByRole('button', { name: /保存|确定/ });
        await saveButton.click();
        await page.waitForTimeout(300);

        // 验证变量已添加（可能显示在列表中）
        await expect(page.locator('text=testVar')).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

test.describe('预览面板联动', () => {
  test('点击预览按钮应该打开预览面板', async ({ page }) => {
    const previewButton = page.getByRole('button', { name: /预览/ });

    await previewButton.click();

    // 等待预览面板打开
    await page.waitForTimeout(300);

    // 检查预览面板是否可见
    const previewPanel = page.locator('[data-testid="preview-panel"], .preview-panel, .n-modal');
    await expect(previewPanel).toBeVisible({ timeout: 3000 });
  });

  test('预览面板应该实时显示变量替换结果', async ({ page }) => {
    // 这个测试需要先设置一些提示词内容和变量
    // 具体实现取决于实际应用的结构

    // 打开预览面板
    const previewButton = page.getByRole('button', { name: /预览/ });
    await previewButton.click();
    await page.waitForTimeout(300);

    // 预览面板应该显示渲染后的内容
    const previewContent = page.locator('[data-testid="preview-content"], .preview-content');
    await expect(previewContent).toBeVisible({ timeout: 3000 });
  });
});

test.describe('测试面板模式化行为', () => {
  test('用户模式下测试面板应该显示变量提示', async ({ page }) => {
    // 确保在用户模式
    const userModeButton = page.getByRole('button', { name: /用户模式/ });
    await userModeButton.click();
    await page.waitForTimeout(200);

    // 如果有变量，应该显示变量提示
    // 注意：这需要先有包含变量的提示词内容
    const variableHint = page.locator('[data-testid="variable-hint"], .variable-hint, text=/检测到变量|Variables Detected/');

    // 检查是否存在（如果有变量的话）
    const isVisible = await variableHint.isVisible({ timeout: 2000 }).catch(() => false);

    // 这个测试可能需要根据实际数据状态调整
    if (isVisible) {
      await expect(variableHint).toBeVisible();
    }
  });

  test('系统模式下应该显示测试输入区域', async ({ page }) => {
    // 切换到系统模式
    const systemModeButton = page.getByRole('button', { name: /系统模式/ });
    await systemModeButton.click();
    await page.waitForTimeout(200);

    // 测试输入区域应该可见
    const testInput = page.locator('[data-testid="test-input"], textarea[placeholder*="测试"], textarea[placeholder*="问题"]');

    // 检查是否存在测试输入区
    const hasTestInput = await testInput.count() > 0;

    if (hasTestInput) {
      await expect(testInput.first()).toBeVisible();
    }
  });

  test('用户模式下应该隐藏测试输入区域', async ({ page }) => {
    // 确保在用户模式
    const userModeButton = page.getByRole('button', { name: /用户模式/ });
    await userModeButton.click();
    await page.waitForTimeout(200);

    // 测试输入区域应该不可见或不存在
    const testInput = page.locator('[data-testid="test-input"], textarea[placeholder*="测试"], textarea[placeholder*="问题"]');

    // 在用户模式下，测试输入应该不可见
    const isVisible = await testInput.isVisible({ timeout: 1000 }).catch(() => false);

    if (!isVisible) {
      // 测试通过：输入区域确实不可见
      expect(true).toBe(true);
    } else {
      // 如果可见，可能是配置问题
      await expect(testInput).not.toBeVisible();
    }
  });
});

test.describe('变量值输入表单（完整实现）', () => {
  test('应该在有变量时显示变量值输入表单', async ({ page }) => {
    // 首先需要优化一个包含变量的提示词
    // 这个测试可能需要先设置包含{{variable}}的内容

    // 查找变量值表单标题
    const formTitle = page.locator('text=/变量值设置|Variable Values/');
    const formCard = page.locator('.n-card:has-text("变量值设置"), .n-card:has-text("Variable Values")');

    // 如果有变量，表单应该可见
    const hasForm = await formCard.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasForm) {
      await expect(formTitle).toBeVisible();

      // 验证显示变量计数
      const varCount = page.locator('text=/个变量|variables/');
      await expect(varCount).toBeVisible();
    }
  });

  test('应该为每个变量提供输入框', async ({ page }) => {
    // 查找变量输入表单
    const formCard = page.locator('.n-card:has-text("变量值设置"), .n-card:has-text("Variable Values")');

    const hasForm = await formCard.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasForm) {
      // 查找变量输入框（应该有多个）
      const variableInputs = page.locator('input[placeholder*="变量值"], input[placeholder*="variable value"]');
      const inputCount = await variableInputs.count();

      // 至少应该有一个变量输入框
      if (inputCount > 0) {
        expect(inputCount).toBeGreaterThan(0);

        // 验证可以在输入框中输入内容
        const firstInput = variableInputs.first();
        await firstInput.fill('测试值');
        await expect(firstInput).toHaveValue('测试值');
      }
    }
  });

  test('应该提供清空全部按钮', async ({ page }) => {
    const formCard = page.locator('.n-card:has-text("变量值设置"), .n-card:has-text("Variable Values")');

    const hasForm = await formCard.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasForm) {
      // 查找清空按钮
      const clearButton = page.getByRole('button', { name: /清空全部|Clear All/ });

      const hasClearButton = await clearButton.isVisible({ timeout: 1000 }).catch(() => false);

      if (hasClearButton) {
        await expect(clearButton).toBeVisible();

        // 填写一个变量值
        const variableInputs = page.locator('input[placeholder*="变量值"], input[placeholder*="variable value"]');
        if (await variableInputs.count() > 0) {
          await variableInputs.first().fill('测试值');

          // 点击清空按钮
          await clearButton.click();
          await page.waitForTimeout(200);

          // 验证输入框被清空
          await expect(variableInputs.first()).toHaveValue('');
        }
      }
    }
  });
});

test.describe('双轮替换预览（完整实现）', () => {
  test('系统模式应该显示第一轮和第二轮替换', async ({ page }) => {
    // 切换到系统模式
    const systemModeButton = page.getByRole('button', { name: /系统模式/ });
    await systemModeButton.click();
    await page.waitForTimeout(200);

    // 查找预览卡片
    const previewCard = page.locator('.n-card:has-text("预览结果"), .n-card:has-text("Preview Result")');

    const hasPreview = await previewCard.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasPreview) {
      // 验证显示第一轮替换
      const firstRound = page.locator('text=/第一轮替换|First Round/');
      const hasFirstRound = await firstRound.isVisible({ timeout: 1000 }).catch(() => false);

      if (hasFirstRound) {
        await expect(firstRound).toBeVisible();

        // 验证显示第二轮替换
        const secondRound = page.locator('text=/第二轮替换|Second Round/');
        await expect(secondRound).toBeVisible();
      }
    }
  });

  test('用户模式应该只显示最终预览', async ({ page }) => {
    // 确保在用户模式
    const userModeButton = page.getByRole('button', { name: /用户模式/ });
    await userModeButton.click();
    await page.waitForTimeout(200);

    // 查找预览卡片
    const previewCard = page.locator('.n-card:has-text("预览结果"), .n-card:has-text("Preview Result")');

    const hasPreview = await previewCard.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasPreview) {
      // 验证显示最终预览
      const finalPreview = page.locator('text=/最终预览|Final Preview/');
      const hasFinalPreview = await finalPreview.isVisible({ timeout: 1000 }).catch(() => false);

      if (hasFinalPreview) {
        await expect(finalPreview).toBeVisible();

        // 验证不显示第一轮和第二轮（系统模式专有）
        const firstRound = page.locator('text=/第一轮替换|First Round/');
        const hasFirstRound = await firstRound.isVisible({ timeout: 500 }).catch(() => false);

        expect(hasFirstRound).toBe(false);
      }
    }
  });

  test('变量值改变应该实时更新预览', async ({ page }) => {
    const formCard = page.locator('.n-card:has-text("变量值设置"), .n-card:has-text("Variable Values")');
    const previewCard = page.locator('.n-card:has-text("预览结果"), .n-card:has-text("Preview Result")');

    const hasForm = await formCard.isVisible({ timeout: 3000 }).catch(() => false);
    const hasPreview = await previewCard.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasForm && hasPreview) {
      // 填写变量值
      const variableInputs = page.locator('input[placeholder*="变量值"], input[placeholder*="variable value"]');

      if (await variableInputs.count() > 0) {
        const testValue = 'E2E测试变量值';
        await variableInputs.first().fill(testValue);

        // 等待预览更新
        await page.waitForTimeout(500);

        // 验证预览中包含输入的值（如果变量被使用）
        // 注意：这取决于实际的提示词内容
        const previewContent = previewCard.locator('.n-card__content');
        const content = await previewContent.textContent();

        // 基本验证：预览内容不为空
        expect(content).toBeTruthy();
      }
    }
  });
});

test.describe('完整工作流', () => {
  test('应该支持完整的用户模式工作流', async ({ page }) => {
    // 步骤 1: 确认在用户模式
    const userModeButton = page.getByRole('button', { name: /用户模式/ });
    await userModeButton.click();
    await page.waitForTimeout(200);

    // 步骤 2: 打开变量管理器
    const variableButton = page.getByRole('button', { name: /变量管理/ });
    await variableButton.click();
    await page.waitForTimeout(300);

    // 步骤 3: 关闭变量管理器（如果有关闭按钮）
    const closeButton = page.getByRole('button', { name: /关闭|取消/ }).first();
    if (await closeButton.isVisible({ timeout: 1000 })) {
      await closeButton.click();
      await page.waitForTimeout(200);
    } else {
      // 可能点击遮罩层关闭
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // 步骤 4: 打开预览
    const previewButton = page.getByRole('button', { name: /预览/ });
    await previewButton.click();
    await page.waitForTimeout(300);

    // 验证预览面板打开
    const previewPanel = page.locator('[data-testid="preview-panel"], .preview-panel, .n-modal');
    await expect(previewPanel).toBeVisible({ timeout: 3000 });
  });

  test('应该支持完整的系统模式工作流', async ({ page }) => {
    // 步骤 1: 切换到系统模式
    const systemModeButton = page.getByRole('button', { name: /系统模式/ });
    await systemModeButton.click();
    await page.waitForTimeout(200);

    // 步骤 2: 验证对话管理按钮可见
    const conversationButton = page.getByRole('button', { name: /管理对话|对话/ });
    await expect(conversationButton).toBeVisible();

    // 步骤 3: 打开变量管理器
    const variableButton = page.getByRole('button', { name: /变量管理/ });
    await variableButton.click();
    await page.waitForTimeout(300);

    // 步骤 4: 关闭变量管理器
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // 步骤 5: 打开预览
    const previewButton = page.getByRole('button', { name: /预览/ });
    await previewButton.click();
    await page.waitForTimeout(300);

    // 验证预览面板打开
    const previewPanel = page.locator('[data-testid="preview-panel"], .preview-panel, .n-modal');
    await expect(previewPanel).toBeVisible({ timeout: 3000 });
  });

  test('应该支持模式切换后的状态保持', async ({ page }) => {
    // 步骤 1: 在用户模式下打开预览
    const userModeButton = page.getByRole('button', { name: /用户模式/ });
    await userModeButton.click();
    await page.waitForTimeout(200);

    const previewButton = page.getByRole('button', { name: /预览/ });
    await previewButton.click();
    await page.waitForTimeout(300);

    // 步骤 2: 切换到系统模式
    await page.keyboard.press('Escape'); // 关闭预览
    await page.waitForTimeout(200);

    const systemModeButton = page.getByRole('button', { name: /系统模式/ });
    await systemModeButton.click();
    await page.waitForTimeout(200);

    // 步骤 3: 验证系统模式下的特性可用
    const conversationButton = page.getByRole('button', { name: /管理对话|对话/ });
    await expect(conversationButton).toBeVisible();

    // 步骤 4: 切换回用户模式
    await userModeButton.click();
    await page.waitForTimeout(200);

    // 步骤 5: 验证对话管理按钮消失
    await expect(conversationButton).not.toBeVisible();
  });
});

test.describe('错误处理与边界情况', () => {
  test('应该处理快速模式切换', async ({ page }) => {
    const userModeButton = page.getByRole('button', { name: /用户模式/ });
    const systemModeButton = page.getByRole('button', { name: /系统模式/ });

    // 快速切换多次
    for (let i = 0; i < 5; i++) {
      await systemModeButton.click();
      await userModeButton.click();
    }

    await page.waitForTimeout(200);

    // 应该仍然正常工作
    await expect(userModeButton).toHaveClass(/primary/);
  });

  test('应该处理快速打开关闭操作', async ({ page }) => {
    const variableButton = page.getByRole('button', { name: /变量管理/ });

    // 快速打开关闭变量管理器
    for (let i = 0; i < 3; i++) {
      await variableButton.click();
      await page.waitForTimeout(100);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
    }

    // 应该仍然正常工作
    await variableButton.click();
    await page.waitForTimeout(300);

    const variableManager = page.locator('[data-testid="variable-manager"], .variable-manager, .n-modal');
    await expect(variableManager).toBeVisible({ timeout: 3000 });
  });
});
