import { test, expect, type Locator, type Page } from '@playwright/test'

/** tailwind.config.js 色板在浏览器中的计算值（用于断言 computed style） */
const RICE_100 = 'rgb(251, 245, 234)' // rice-100  #fbf5ea，浅色模式页面背景 / 夜间模式主要文字
const RICE_200 = 'rgb(243, 230, 208)' // rice-200  #f3e6d0，夜间模式次要文字
const CHARCOAL_900 = 'rgb(33, 31, 28)' // charcoal-900 #211f1c，夜间模式页面背景
const CHARCOAL_700 = 'rgb(52, 49, 45)' // charcoal-700 #34312d，夜间模式卡片/面板背景
const CHARCOAL_700_95 = 'rgba(52, 49, 45, 0.95)' // dark:bg-charcoal-700/95，半透明面板（导航栏/底部导航）

type StyleProperty = 'background-color' | 'color' | 'font-size'

interface DarkAtInteractive {
  dark: boolean
  rootMounted: boolean
}

/** 从应用入口进入菜单点餐视图（TopBar 仅在该视图可见）。 */
async function goToMenu(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /快速进入 A08/ }).click()
  await page.getByRole('button', { name: '进入点餐' }).click()
}

/** 打开首个菜品卡的规格弹窗（与 super-spicy.spec.ts 的 goToBrothSpec 保持一致）。 */
async function openFirstSpecDialog(page: Page) {
  await page.locator('article').first().locator('button').last().click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

/**
 * 断言元素的计算样式。
 * 见 AGENTS.md「断言编写预防清单」：全局 transition 为 250ms，断言 computed style 需等过渡结束，
 * 因此用 expect.poll 轮询而非固定 sleep。
 */
async function expectStyleValue(locator: Locator, property: StyleProperty, expected: string) {
  await expect
    .poll(() => locator.first().evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), property))
    .toBe(expected)
}

test.describe('夜间模式（Dark Mode）- E2E 验收测试', () => {
  test('REQ-001.1: TopBar 显示夜间模式切换按钮，浅色模式下为「切换至夜间模式」并使用 Moon 图标', async ({ page }) => {
    await goToMenu(page)
    const toggle = page.getByRole('button', { name: '切换至夜间模式' })
    await expect(toggle).toBeVisible()
    await expect(toggle.locator('svg.lucide-moon')).toHaveCount(1)
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('REQ-001.7: 首次使用（localStorage 无记录）默认浅色模式', async ({ page }) => {
    await goToMenu(page)
    expect(await page.evaluate(() => localStorage.getItem('dark-mode'))).not.toBe('true')
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    // :root 背景为 rice-100（#fbf5ea），夜间模式下为 charcoal-900
    await expectStyleValue(page.locator('html'), 'background-color', RICE_100)
  })

  test('REQ-001.2: 点击切换按钮后全站过渡为深色配色并变为 Sun 图标', async ({ page }) => {
    await goToMenu(page)
    // 全局过渡时长为 250ms（GOAL-001 ≤ 250ms）
    const transitionDuration = await page.evaluate(() => getComputedStyle(document.documentElement).transitionDuration)
    expect(transitionDuration).toContain('0.25s')

    await page.getByRole('button', { name: '切换至夜间模式' }).click()

    await expect(page.locator('html')).toHaveClass(/dark/)
    await expectStyleValue(page.locator('html'), 'background-color', CHARCOAL_900)
    // 应用根容器（bg-rice-100 → dark:bg-charcoal-900）
    await expectStyleValue(page.locator('div.paper-noise'), 'background-color', CHARCOAL_900)

    const toggle = page.getByRole('button', { name: '切换至日间模式' })
    await expect(toggle).toBeVisible()
    await expect(toggle.locator('svg.lucide-sun')).toHaveCount(1)
  })

  test('REQ-001.3: 切换夜间/日间模式时通过 Toast 提示当前模式', async ({ page }) => {
    await goToMenu(page)
    await page.getByRole('button', { name: '切换至夜间模式' }).click()
    await expect(page.getByText('已切换为夜间模式')).toBeVisible()

    await page.getByRole('button', { name: '切换至日间模式' }).click()
    await expect(page.getByText('已切换为日间模式')).toBeVisible()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('REQ-001.4: 夜间模式状态持久化到 localStorage 且刷新后保持', async ({ page }) => {
    await goToMenu(page)
    await page.getByRole('button', { name: '切换至夜间模式' }).click()
    await expectStyleValue(page.locator('html'), 'background-color', CHARCOAL_900)
    expect(await page.evaluate(() => localStorage.getItem('dark-mode'))).toBe('true')

    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expectStyleValue(page.locator('html'), 'background-color', CHARCOAL_900)

    // 刷新后回到绑定餐桌页，未进入主流程视图前 dark class 已全局生效（REQ-002.1）
    await expectStyleValue(page.locator('main.paper-noise'), 'background-color', CHARCOAL_900)
    await page.getByRole('button', { name: /快速进入 A08/ }).click()
    // 欢迎页同样应用深色背景
    await expectStyleValue(page.locator('main.paper-noise'), 'background-color', CHARCOAL_900)
    await page.getByRole('button', { name: '进入点餐' }).click()
    // 主流程中切换按钮状态已恢复为夜间模式
    await expect(page.getByRole('button', { name: '切换至日间模式' })).toBeVisible()
  })

  test('REQ-001.6: localStorage 已保存夜间模式时，React 挂载前即应用 dark class（防 FOUC）', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('dark-mode', 'true'))
    await page.addInitScript(() => {
      const win = window as unknown as { __darkAtInteractive: DarkAtInteractive | null }
      win.__darkAtInteractive = null
      // readyState=interactive 时 DOM 解析完成但延迟/模块脚本（React 挂载）尚未执行
      document.addEventListener('readystatechange', () => {
        if (document.readyState !== 'interactive' || win.__darkAtInteractive) return
        const root = document.getElementById('root')
        win.__darkAtInteractive = {
          dark: document.documentElement.classList.contains('dark'),
          rootMounted: !!root && root.childElementCount > 0,
        }
      })
    })
    await page.reload()
    await page.locator('#root > *').first().waitFor()

    const record = await page.evaluate(
      () => (window as unknown as { __darkAtInteractive: DarkAtInteractive | null }).__darkAtInteractive,
    )
    expect(record).not.toBeNull()
    expect(record!.dark).toBe(true)
    expect(record!.rootMounted).toBe(false)
  })

  test('REQ-002: 夜间模式下菜单页、规格弹窗与桌面购物车面板均使用深色配色', async ({ page }) => {
    await goToMenu(page)
    await page.getByRole('button', { name: '切换至夜间模式' }).click()

    // 页面容器
    await expectStyleValue(page.locator('div.paper-noise'), 'background-color', CHARCOAL_900)
    // 顶部导航栏（dark:bg-charcoal-700/95）
    await expectStyleValue(page.locator('header'), 'background-color', CHARCOAL_700_95)

    // 菜品卡片与标题文字
    const card = page.locator('article').first()
    await expectStyleValue(card, 'background-color', CHARCOAL_700)
    await expectStyleValue(card.getByRole('heading'), 'color', RICE_100)

    // 规格选择弹窗（Radix Dialog）
    await openFirstSpecDialog(page)
    const dialog = page.getByRole('dialog')
    await expectStyleValue(dialog, 'background-color', CHARCOAL_700)
    await page.getByRole('button', { name: '加入本桌购物车' }).click()
    await expect(dialog).not.toBeVisible()

    // 桌面端购物车面板（lg 断点下 aside 侧栏内唯一 section）
    const cartPanel = page.locator('aside section').first()
    await expectStyleValue(cartPanel, 'background-color', CHARCOAL_700)
    await expectStyleValue(cartPanel.getByRole('heading', { name: '本桌购物车' }), 'color', RICE_100)
  })

  test('REQ-002.1: 夜间模式下订单页与结账页使用深色配色', async ({ page }) => {
    await goToMenu(page)
    await page.getByRole('button', { name: '切换至夜间模式' }).click()
    await openFirstSpecDialog(page)
    await page.getByRole('button', { name: '加入本桌购物车' }).click()
    await page.getByRole('button', { name: '确认并提交订单' }).click()

    // 订单履约页
    const itemsSection = page.locator('section', { has: page.getByRole('heading', { name: '已点菜品' }) })
    await expectStyleValue(itemsSection, 'background-color', CHARCOAL_700)
    await expectStyleValue(page.getByRole('heading', { name: '这一锅，正在抵达' }), 'color', RICE_100)

    // 结账页
    await page.getByRole('button', { name: '去结账' }).click()
    const billSection = page.locator('section', { has: page.getByRole('heading', { name: '核对本桌账单' }) })
    await expectStyleValue(billSection, 'background-color', CHARCOAL_700)
    await expectStyleValue(page.getByRole('heading', { name: '核对本桌账单' }), 'color', RICE_100)
  })

  test('REQ-002.4: 移动端底部导航与移动端购物车弹窗在夜间模式下使用深色配色', async ({ page }) => {
    // 移动端布局需在 lg 断点以下验证（见 AGENTS.md 断言预防清单）
    await page.setViewportSize({ width: 390, height: 844 })
    await goToMenu(page)
    await page.getByRole('button', { name: '切换至夜间模式' }).click()

    const bottomNav = page.locator('nav.safe-bottom')
    await expect(bottomNav).toBeVisible()
    await expectStyleValue(bottomNav, 'background-color', CHARCOAL_700_95)
    // 非激活态导航项文字为 rice-200
    await expectStyleValue(bottomNav.getByRole('button', { name: '订单' }), 'color', RICE_200)

    // 移动端购物车弹窗
    await openFirstSpecDialog(page)
    await page.getByRole('button', { name: '加入本桌购物车' }).click()
    await page.getByRole('button', { name: /查看购物车/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expectStyleValue(dialog, 'background-color', CHARCOAL_700)
  })

  test('REQ-002.5: 夜间模式与老人模式可叠加使用', async ({ page }) => {
    await goToMenu(page)
    await page.getByRole('button', { name: '切换至夜间模式' }).click()
    await page.getByRole('button', { name: '切换至老人模式' }).click()

    const html = page.locator('html')
    await expect(html).toHaveClass(/dark/)
    await expect(html).toHaveClass(/elderly/)
    // 老人模式放大字号 125% → 16px * 1.25 = 20px
    await expectStyleValue(html, 'font-size', '20px')
    await expectStyleValue(html, 'background-color', CHARCOAL_900)

    // 关闭夜间模式后老人模式仍然生效
    await page.getByRole('button', { name: '切换至日间模式' }).click()
    await expect(html).not.toHaveClass(/dark/)
    await expect(html).toHaveClass(/elderly/)
    await expectStyleValue(html, 'font-size', '20px')
  })

  test('NFR-004: 夜间模式主要文字与背景对比度 ≥ 4.5:1（WCAG AA）', async ({ page }) => {
    await goToMenu(page)
    await page.getByRole('button', { name: '切换至夜间模式' }).click()

    const card = page.locator('article').first()
    // 先等待过渡结束（250ms transition），再进行对比度计算
    await expectStyleValue(card, 'background-color', CHARCOAL_700)
    await expectStyleValue(card.getByRole('heading'), 'color', RICE_100)

    const ratios = await page.evaluate(() => {
      function luminance(color: string): number {
        const [r, g, b] = (color.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map((value) => {
          const channel = Number(value) / 255
          return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
        })
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      function contrast(selector: string, backgroundSelector: string): number | null {
        const el = document.querySelector(selector)
        const backgroundEl = document.querySelector(backgroundSelector)
        if (!el || !backgroundEl) return null
        const first = luminance(getComputedStyle(el).color)
        const second = luminance(getComputedStyle(backgroundEl).backgroundColor)
        const [high, low] = first > second ? [first, second] : [second, first]
        return Math.round(((high + 0.05) / (low + 0.05)) * 100) / 100
      }
      return {
        dishName: contrast('article h3', 'article'), // 主要文字 rice-100 / charcoal-700
        dishDescription: contrast('article p', 'article'), // 次要文字 rice-200 / charcoal-700
        cartTitle: contrast('aside section h3', 'aside section'),
        dishPrice: contrast('article p.text-chili-500', 'article'), // 品牌红（REQ-002.3，仅记录观测值）
      }
    })

    console.log('[contrast] ratio=', JSON.stringify(ratios))
    expect(ratios.dishName).toBeGreaterThanOrEqual(4.5)
    expect(ratios.dishDescription).toBeGreaterThanOrEqual(4.5)
    expect(ratios.cartTitle).toBeGreaterThanOrEqual(4.5)
  })

  test('NFR-006: localStorage 不可用时夜间模式降级为内存态切换，不报错不阻塞', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.addInitScript(() => {
      Storage.prototype.getItem = function () {
        throw new Error('localStorage unavailable')
      }
      Storage.prototype.setItem = function () {
        throw new Error('localStorage unavailable')
      }
    })

    await goToMenu(page)
    await page.getByRole('button', { name: '切换至夜间模式' }).click()

    // 仍可完成内存态切换
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expectStyleValue(page.locator('html'), 'background-color', CHARCOAL_900)
    await expect(page.getByText('已切换为夜间模式')).toBeVisible()
    expect(pageErrors.filter((message) => message.includes('localStorage unavailable'))).toEqual([])
  })
})
