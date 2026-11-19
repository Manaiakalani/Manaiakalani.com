import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (const [n, vp, dsf] of [['d', {width:1280,height:900}, 2], ['m', {width:440,height:956}, 3]]) {
const p = await b.newPage({ viewport: vp, deviceScaleFactor: dsf, colorScheme: 'dark' });
await p.goto('http://localhost:4180/now');
await p.locator('.cube-wrapper').scrollIntoViewIfNeeded();
await p.waitForTimeout(2600);
await p.locator('.cube-wrapper').screenshot({ path: `../view/s/cube-${n}.png` });
await p.close();
}
await b.close();
