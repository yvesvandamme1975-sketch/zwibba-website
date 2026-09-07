import assert from 'node:assert/strict';
import test from 'node:test';
import { createLegalAwareFetch } from '../App/services/legal-api-fetch.mjs';

test('authenticated 428 refreshes the current account without consuming the response', async () => {
 let refreshed=0;
 const fetchFn=createLegalAwareFetch({fetchFn:async()=>Response.json({code:'TERMS_ACCEPTANCE_REQUIRED'},{status:428}),getSessionToken:()=> 'current',onTermsRequired:()=>refreshed++});
 const response=await fetchFn('https://api.example/profile',{headers:{authorization:'Bearer current'}});
 assert.equal(refreshed,1);assert.equal((await response.json()).code,'TERMS_ACCEPTANCE_REQUIRED');
});

test('late refusals from another session never refresh the new account', async()=>{
 let token='old';let finish;let refreshed=0;
 const fetchFn=createLegalAwareFetch({fetchFn:()=>new Promise(resolve=>finish=resolve),getSessionToken:()=>token,onTermsRequired:()=>refreshed++});
 const pending=fetchFn('https://api.example/profile',{headers:{authorization:'Bearer old'}});
 token='new';finish(new Response(null,{status:428}));await pending;assert.equal(refreshed,0);
});

test('public requests and ordinary failures do not initiate acceptance', async()=>{
 let refreshed=0;let status=428;
 const fetchFn=createLegalAwareFetch({fetchFn:async()=>new Response(null,{status}),getSessionToken:()=> 'current',onTermsRequired:()=>refreshed++});
 await fetchFn('https://api.example/listings');status=500;
 await fetchFn('https://api.example/profile',{headers:new Headers({authorization:'Bearer current'})});
 assert.equal(refreshed,0);
});
