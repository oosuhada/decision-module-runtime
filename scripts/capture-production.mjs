import { chromium } from '@playwright/test';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const baseURL = 'http://127.0.0.1:3103';
const captureDir = '/tmp/generative-decision-surface-capture';
const workspaceId = `portfolio-production-${Date.now()}`;

await rm(captureDir, { recursive: true, force: true });
await mkdir(captureDir, { recursive: true });

const browser = await chromium.launch();

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await desktop.newPage();
  await page.goto(`${baseURL}/w/${workspaceId}`);
  await page.getByRole('button', { name: 'PLAN REQUEST' }).click();
  await page.getByText('Review the instrument graph before assembly.').waitFor();
  await page.screenshot({ path: path.join(captureDir, 'frame-00.png'), fullPage: true });

  await page.getByRole('button', { name: 'APPROVE & ASSEMBLE' }).click();
  for (let index = 1; index <= 7; index += 1) {
    await page.waitForTimeout(130);
    await page.screenshot({ path: path.join(captureDir, `frame-${String(index).padStart(2, '0')}.png`), fullPage: true });
  }
  await page.getByText('COMPLETE', { exact: true }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'public/production-desktop.png', fullPage: true });
  await page.screenshot({ path: path.join(captureDir, 'frame-08.png'), fullPage: true });
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(`${baseURL}/w/${workspaceId}`);
  await mobilePage.getByRole('button', { name: /STACK/ }).waitFor();
  await mobilePage.waitForTimeout(400);
  await mobilePage.screenshot({ path: 'public/production-mobile.png', fullPage: true });
  await mobile.close();
} finally {
  await browser.close();
}

console.log(JSON.stringify({ workspaceId, captureDir }));
