import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const baseUrl=process.env.UI_TEST_BASE_URL||'http://127.0.0.1:4340';
for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
 const browser=await engine.launch({headless:true});
 try{
  for(const width of [320,390,768,1440]){
   const page=await browser.newPage({viewport:{width,height:900},serviceWorkers:'block'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   for(const route of ['/','/be/','/be/nl/']){
    await page.goto(baseUrl+route);await page.waitForLoadState('networkidle');
    const dimensions=await page.evaluate(()=>({viewport:innerWidth,content:document.documentElement.scrollWidth}));
    assert.ok(dimensions.content<=dimensions.viewport,`${name} ${width} ${route}: overflow ${JSON.stringify(dimensions)}`);
    const nav=page.locator('nav.site-nav');assert.ok(await nav.getAttribute('aria-label'));
    const appLink=page.locator('.section--cta a[href^="/App/"]');assert.equal(await appLink.count(),1);
    if(width<1100){
     const toggle=page.locator('.menu-toggle');await toggle.click();
     assert.equal(await toggle.getAttribute('aria-expanded'),'true');
     await page.keyboard.press('Escape');assert.equal(await toggle.getAttribute('aria-expanded'),'false');
     assert.equal(await toggle.evaluate(e=>e===document.activeElement),true);
    }
    assert.deepEqual(errors,[]);console.log(`PASS ${name} ${width}: ${route}`);
   }
   await page.close();
  }
 }finally{await browser.close();}
}
