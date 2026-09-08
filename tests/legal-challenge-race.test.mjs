import assert from 'node:assert/strict';
import test from 'node:test';
import {createAuthService,authStorageKey} from '../App/services/auth-service.mjs';
for(const replacement of [null,{challengeId:'new',phoneNumber:'+243990000001'}]){
 test(`late legal refresh preserves ${replacement?'a newer phone challenge':'a completed challenge'}`,async()=>{
  const values=new Map([[authStorageKey,JSON.stringify({pendingChallenge:{challengeId:'old',phoneNumber:'+32499000001'},session:null})]]);
  let finish;
  const service=createAuthService({storage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},apiBaseUrl:'https://api.example',fetchFn:()=>new Promise(resolve=>finish=resolve)});
  const pending=service.refreshPendingChallengeLegal();
  values.set(authStorageKey,JSON.stringify({pendingChallenge:replacement,session:null}));
  finish(Response.json({active:true,documents:[{kind:'terms',market:'BE',locale:'fr-BE',hash:'be-hash',version:'2026-09-07'}]}));
  assert.deepEqual(await pending,replacement);
  assert.deepEqual(service.getPendingChallenge(),replacement);
 });
}
