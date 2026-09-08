import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch();
try{for(const width of [320,390,1440])for(const failure of [false,true]){
 const page=await browser.newPage({viewport:{width,height:900},serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{Object.defineProperty(window,'ZWIBBA_API_BASE_URL',{get:()=>location.origin+'/api-fixture',set:()=>{}});localStorage.setItem('zwibba_app_auth',JSON.stringify({session:{sessionToken:'fixture-only',phoneNumber:'+32499000001'},pendingChallenge:null}));});
 await page.route('**/api-fixture/**',async r=>{
 const p=new URL(r.request().url()).pathname.replace('/api-fixture','');
 let json={items:[]};
 if(p.startsWith('/auth/legal'))json={active:false,needsAcceptance:false,documents:[]};
 else if(failure)return r.fulfill({status:503,json:{message:'Connexion indisponible. Réessayez.'}});
 else if(p==='/profile')json={id:'fixture',displayName:'É'.repeat(40),area:'Bruxelles',phoneNumber:'+32499000001'};
 else if(p==='/wallet')json={balanceCdf:0,transactions:[]};
 else if(p==='/chat/threads/fixture')json={id:'fixture',listingTitle:'Vélo '+ 'Z'.repeat(120),participantName:'Vendeur test',messages:[{senderRole:'buyer',body:'Bonjour '+ 'X'.repeat(350),sentAtLabel:'Aujourd’hui'}]};
 return r.fulfill({json});
 });
 for(const route of ['profile','wallet','messages','thread/fixture']){
 await page.goto('http://127.0.0.1:4340/App/#'+route);await page.waitForLoadState('networkidle');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 assert.equal(overflow,false,`${width} ${route} failure=${failure}: horizontal overflow`);
 assert.deepEqual(errors,[]);
 console.log(`PASS account ${width} ${route} failure=${failure}`);
 }

 await page.close();
}}finally{await browser.close();}

