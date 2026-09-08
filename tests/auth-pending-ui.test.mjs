import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPhoneInputScreen} from '../App/features/auth/phone-input-screen.mjs';
import {renderOtpScreen} from '../App/features/auth/otp-screen.mjs';
test('phone form supports defaults, pending feedback and accessible retry errors',()=>{
 assert.doesNotThrow(()=>renderPhoneInputScreen());
 const busy=renderPhoneInputScreen({busy:true,phoneNumber:'+32499000001'});
 assert.match(busy,/aria-busy="true"/);assert.match(busy,/<button[^>]+disabled/);assert.match(busy,/Envoi du code…/);
 const error=renderPhoneInputScreen({errorMessage:'Réessayez',phoneNumber:'+32499000001'});
 assert.match(error,/role="alert"/);assert.match(error,/autocomplete="tel"/);assert.doesNotMatch(error,/<div[^>]*><li>/);
});
test('OTP form exposes verification state without duplicate submit affordance',()=>{
 const html=renderOtpScreen({busy:true});assert.match(html,/aria-busy="true"/);assert.match(html,/<button[^>]+disabled/);assert.match(html,/Vérification…/);
 assert.doesNotMatch(html,/Confirmez le code OTP/);
});
