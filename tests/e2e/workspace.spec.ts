import { expect, test } from '@playwright/test';

async function assemble(page: import('@playwright/test').Page, id: string) {
  await page.goto(`/w/${id}`);
  await page.getByRole('button', { name: 'PLAN REQUEST' }).click();
  await expect(page.getByText('Review the instrument graph before assembly.')).toBeVisible();
  await page.getByRole('button', { name: 'APPROVE & ASSEMBLE' }).click();
  await expect(page.getByText('COMPLETE', { exact: true })).toBeVisible({ timeout: 15_000 });
}

test.describe('production workspace flow', () => {
  test('plan, approve, recompute, undo, snapshot, decision, export and refresh', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.includes('mobile'));
    const id = `e2e-${Date.now()}`;
    await assemble(page, id);
    await expect(page.getByText('SYSTEM RECOMMENDATION')).toBeVisible();

    const budget = page.getByRole('slider', { name: 'Budget index' });
    await budget.fill('50');
    await expect(page.getByText(/input-changed/).first()).toBeVisible();

    await page.getByRole('button', { name: /Delete Score chart/ }).click();
    await page.getByRole('button', { name: 'Confirm delete' }).click();
    await page.getByTitle('Undo').click();
    await expect(page.getByRole('article', { name: /Score chart/ })).toBeVisible();

    await page.getByPlaceholder('Your decision').fill('Helix');
    await page.getByPlaceholder('Why this choice?').fill('Security evidence and deterministic score support the choice.');
    await page.getByRole('button', { name: 'Record human decision' }).click();
    await expect(page.getByText('HUMAN ✓')).toBeVisible();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'EXPORT JSON' }).click();
    expect((await download).suggestedFilename()).toContain(id);

    await page.reload();
    await expect(page.getByText('HUMAN ✓')).toBeVisible();
    await expect(page.getByText('Helix', { exact: true }).first()).toBeVisible();
  });

  test('list/tree keyboard alternative and read-only share mode', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.includes('mobile'));
    const id = `tree-${Date.now()}`;
    await page.goto(`/w/${id}`);
    await page.getByRole('button', { name: 'PLAN REQUEST' }).click();
    await expect(page.getByText('Review the instrument graph before assembly.')).toBeVisible();
    await page.getByRole('button', { name: 'Remove Score chart from plan' }).click();
    await page.getByRole('button', { name: 'APPROVE & ASSEMBLE' }).click();
    await expect(page.getByText('COMPLETE', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Score chart', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: /LIST\/TREE/ }).click();
    await expect(page.getByText('Complete the decision without the spatial canvas.')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    await page.goto(`/w/${id}?mode=readonly`);
    await expect(page.getByRole('button', { name: 'PLAN REQUEST' })).toBeDisabled();
  });
});

test.describe('mobile redesign', () => {
  test('uses readable stack/focus/path/summary modes instead of a scaled desktop canvas', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.includes('desktop'));
    const id = `mobile-${Date.now()}`;
    await assemble(page, id);
    await expect(page.getByRole('button', { name: /STACK/ })).toBeVisible();
    await expect(page.locator('.workspace-frame > .react-flow')).toBeHidden();
    const firstTitle = page.locator('.stack-summary strong').first();
    const fontSize = await firstTitle.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(16);
    const touchHeight = await page.getByRole('button', { name: /FOCUS/ }).evaluate((node) => node.getBoundingClientRect().height);
    expect(touchHeight).toBeGreaterThanOrEqual(44);
    await page.getByRole('button', { name: /FOCUS/ }).click();
    await expect(page.getByText(/1 \/ 11/)).toBeVisible();
    await page.getByRole('button', { name: /PATH/ }).click();
    await expect(page.getByText('DEPENDENCY PATH')).toBeVisible();
    await page.getByRole('button', { name: /DECIDE/ }).click();
    await expect(page.getByText('DECISION SUMMARY')).toBeVisible();
  });
});
