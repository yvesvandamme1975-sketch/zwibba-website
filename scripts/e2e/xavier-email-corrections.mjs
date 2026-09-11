import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: {width:390,height:844} });
const errors=[]; page.on('pageerror', e=>errors.push(e.stack));
let postStatus=503, posts=0;
const detail={id:'fixture',slug:'fixture',title:'Annonce de test',contactActions:['message'],safetyTips:[],seller:{name:'Vendeur'},storyImageUrl:'http://127.0.0.1:4328/story.png',priceAmount:100,priceCurrency:'EUR',locationLabel:'Bruxelles'};
await page.route('**/*', async route=>{
 const url=new URL(route.request().url());
 if(url.pathname==='/story.png') return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7f8AAAAASUVORK5CYII=','base64')});
 if(url.host==='127.0.0.1:4328') return route.continue();
 let body={}; let status=200;
 if(url.pathname.endsWith('/listings/fixture')) body=detail;
 else if(url.pathname.endsWith('/chat/threads') && route.request().method()==='POST'){posts++;status=postStatus;body=postStatus===200?{id:'synthetic-thread',messages:[],listing:detail,participants:[]}:{message:'fixture failure'};}
 else if(url.pathname.includes('/chat/threads/')) body={id:'synthetic-thread',messages:[],listing:detail,participants:[]};
 else if(url.pathname.endsWith('/listings')||url.pathname.endsWith('/chat/threads')) body=[];
 else if(url.pathname.includes('legal')) body={active:false,required:false,documents:[]};
 return route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
});
await page.addInitScript(()=>{
 if (!sessionStorage.getItem('fixture-seeded')) { localStorage.setItem('zwibba_app_auth',JSON.stringify({session:{sessionToken:'synthetic',userId:'fixture'}})); sessionStorage.setItem('fixture-seeded','true'); }
 window.shareCalls=[];
 Object.defineProperty(navigator,'share',{value:async payload=>{window.shareCalls.push({url:payload.url,files:payload.files?.length});}});
 Object.defineProperty(navigator,'canShare',{value:()=>true});
});
try {
 await page.goto('http://127.0.0.1:4328/App/#listing/fixture');
 await page.getByRole('button',{name:'Envoyer un message',exact:true}).waitFor();
 await page.getByRole('button',{name:'Partager',exact:true}).click();
 assert.equal((await page.evaluate(()=>window.shareCalls))[0].url,'http://127.0.0.1:4328/annonce/fixture/');
 await page.getByRole('button',{name:'Partager en story',exact:true}).click();
 await page.getByRole('button',{name:'Partager l’image…',exact:true}).waitFor();
 await page.getByRole('button',{name:'Partager l’image…',exact:true}).click();
 assert.equal((await page.evaluate(()=>window.shareCalls))[1].files,1);
 await page.getByRole('button',{name:'Fermer',exact:true}).click();
 await page.getByRole('button',{name:'Envoyer un message',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Impossible d’ouvrir'}).waitFor();
 assert.equal(posts,1); assert.match(page.url(),/#listing\/fixture/);
 postStatus=200;
 await page.getByRole('button',{name:'Envoyer un message',exact:true}).click();
 await page.waitForURL('**/#thread/synthetic-thread');
 assert.equal(posts,2);
 postStatus=401;
 await page.goto('http://127.0.0.1:4328/App/#listing/fixture');
 await page.getByRole('button',{name:'Envoyer un message',exact:true}).click();
 await page.waitForURL('**/#auth-welcome');
 assert.equal(posts,3);
 await page.goto('http://127.0.0.1:4328/App/#listing/fixture');
 await page.getByRole('button',{name:'Envoyer un message',exact:true}).click();
 await page.waitForURL('**/#auth-welcome');
 assert.equal(posts,3);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,viewport:'390x844',nativeLink:true,storyFile:true,messageFailureVisible:true,retryThreadRoute:true,realApiRequests:0}));
} finally { await page.screenshot({path:'/private/tmp/zwibba-xavier-message-check.png',fullPage:true}); await browser.close(); }
