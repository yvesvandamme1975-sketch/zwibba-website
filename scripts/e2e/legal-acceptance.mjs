import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true});
try {
 for (const mode of ['otp','existing','activation']) {
  const existing=mode==='existing';
  let activated=mode!=='activation';
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let accepted=false;
  const terms={kind:'terms',locale:'fr-BE',market:'BE',version:'2026-09-07',hash:'abc',url:'https://zwibba.com/legal/fr-BE/terms/',title:'Conditions générales'};
  const documents=[terms,{...terms,kind:'privacy',title:'Confidentialité',url:'https://zwibba.com/legal/fr-BE/privacy/'},{...terms,kind:'legal-notice',title:'Mentions légales',url:'https://zwibba.com/legal/fr-BE/legal-notice/'}];
  await page.addInitScript(({existing,terms,documents,mode})=>{
   Object.defineProperty(window,'ZWIBBA_API_BASE_URL',{get:()=> 'https://api.test.invalid',set:()=>{}});
   localStorage.setItem('zwibba_app_auth',JSON.stringify(existing?{session:{sessionToken:'fixture-session',phoneNumber:'+32499000001'},pendingChallenge:null}:{session:null,pendingChallenge:{phoneNumber:'+32499000001',legal:mode==='activation'?null:{required:true,terms,documents}}}));
  },{existing,terms,documents,mode});
  await page.route('https://api.test.invalid/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   let json={items:[]};
   if(path==='/auth/legal-documents') json={active:activated,documents:activated?documents:[]};
   if(path==='/auth/legal-status') json={active:true,needsAcceptance:!accepted,terms,documents};
   if(path==='/auth/accept-terms'||path==='/auth/verify-otp'){
    const body=route.request().postDataJSON();
    if(!activated){activated=true;return route.fulfill({status:400,json:{code:'TERMS_ACCEPTANCE_REQUIRED',message:'Veuillez accepter les CGU.'}});}
    assert.deepEqual(path.endsWith('verify-otp')?body.legalAcceptance:body,{accepted:true,version:terms.version,hash:terms.hash,locale:terms.locale});
    accepted=true;json=path.endsWith('verify-otp')?{sessionToken:'fixture-session',phoneNumber:'+32499000001'}:{active:true,needsAcceptance:false,terms,documents};
   }
   await route.fulfill({json});
  });
  await page.goto('http://127.0.0.1:4330/App/'+(existing?'#profile':'#otp'));
  if(mode==='activation'){
   await page.waitForLoadState('networkidle');
   await page.locator('[name="otpCode"]').fill('111111');
   await page.locator('form[data-form="verify-otp"] button[type="submit"]').click();
  }
  const checkbox=page.locator('[name="acceptedTerms"]');await checkbox.waitFor({timeout:5000});
  assert.equal(await checkbox.isChecked(),false);
  assert.equal(await checkbox.getAttribute('required')!==null,true);
  if(!existing) {assert.doesNotMatch(await page.locator('body').innerText(),/123456|simulons|Railway/);await page.locator('[name="otpCode"]').fill('111111');}
  await page.screenshot({path:`/private/tmp/zwibba-legal-${existing?'existing':'otp'}.png`,animations:'disabled'});
  await checkbox.check();
  await page.locator(`form[data-form="${existing?'accept-terms':'verify-otp'}"] button[type="submit"]`).click();
  await page.waitForFunction(()=>!document.querySelector('[name="acceptedTerms"]'));
  assert.equal(accepted,true);assert.deepEqual(errors,[]);
  console.log('PASS',mode);await page.close();
 }
} finally {await browser.close();}
