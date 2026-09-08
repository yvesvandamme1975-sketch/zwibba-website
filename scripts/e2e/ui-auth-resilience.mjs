import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
const baseUrl = process.env.UI_TEST_BASE_URL || 'http://127.0.0.1:4340';
for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
 const browser = await engine.launch({headless:true});
 try {
  for (const mode of ['phone','otp']) {
   const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}});
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(mode=>{
    Object.defineProperty(window,'ZWIBBA_API_BASE_URL',{get:()=> location.origin+'/api-fixture',set:()=>{}});
    if(mode==='otp')localStorage.setItem('zwibba_app_auth',JSON.stringify({session:null,pendingChallenge:{phoneNumber:'+32499000001',challengeId:'fixture',legal:{required:true,terms:{kind:'terms',locale:'fr-BE',market:'BE',version:'fixture-v1',hash:'fixture-hash',url:'/legal/fr-BE/terms/',title:'Conditions générales'},documents:[]}}}));
   },mode);
   let requests=0;let release;let observeRequest;
   const requestObserved=new Promise(resolve=>{observeRequest=resolve;});
   const pending=new Promise(resolve=>{release=resolve;});
   await page.route('**/api-fixture/**',async route=>{
    const path=new URL(route.request().url()).pathname.replace('/api-fixture','');
    if(path==='/auth/request-otp'||path==='/auth/verify-otp'){
     requests++;observeRequest();await pending;
     return route.fulfill({status:503,json:{message:'Connexion momentanément indisponible. Réessayez.'}});
    }
    return route.fulfill({json:path==='/auth/legal-documents'?{active:false,documents:[]}:{items:[]}});
   });
   await page.goto(`${baseUrl}/App/#${mode}`);await page.waitForLoadState('networkidle');
   const field=page.locator(`[name=${mode==='phone'?'phoneNumber':'otpCode'}]`);
   await field.fill(mode==='phone'?'+32499000001':'111111');
   if(mode==='otp')await page.locator('[name=acceptedTerms]').check();
   const form=page.locator(`[data-form=${mode==='phone'?'request-otp':'verify-otp'}]`);
   await form.evaluate(el=>{for(let i=0;i<3;i++)el.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
   await page.waitForFunction(()=>document.querySelector('form[aria-busy="true"] button:disabled'));
   assert.equal(await form.getAttribute('aria-busy'),'true');
   await Promise.race([requestObserved,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Auth request not observed')),5000))]);
   assert.equal(requests,1);
   release();await page.locator('[role=alert]').waitFor();
   assert.equal(await form.locator('button').isEnabled(),true);
   assert.equal(await field.inputValue(),mode==='phone'?'+32499000001':'111111');
   if(mode==='otp')assert.equal(await page.locator('[name=acceptedTerms]').isChecked(),true);
   assert.deepEqual(errors,[]);
   console.log(`PASS ${name}: ${mode} serializes submission and recovers from API failure`);
   await page.close();
  }
 } finally {await browser.close();}
}
