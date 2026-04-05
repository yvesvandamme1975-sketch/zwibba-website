# Zwibba Internal Beta Device QA

This checklist is for the current live stack:

- App: https://website-production-7a12.up.railway.app/App/#sell
- API: https://api-production-b1b58.up.railway.app/healthz
- Admin: https://admin-production-c78b.up.railway.app/moderation

Tester accounts:

- Seller flow: `+243990000001`
- Buyer flow: `+243990000002`
- Demo OTP code: `123456`

## Real-device coverage

Run this pass on:

- iPhone Safari
- Android Chrome
- Desktop Chrome or Safari

## Seller flow

1. Open `/App/#profile`
2. Verify the seller number and set a profile zone
3. Go to `Vendre`
4. Start a listing with a real photo from the device
5. Confirm the staged progress appears:
   - Compression
   - Téléversement
   - Analyse IA
6. Confirm `Photo confirmée` shows the uploaded image and AI summary
7. Continue to review
8. Enter a manual price in CDF
9. Publish the listing
10. Open the created listing from success

Expected result:

- the uploaded image renders
- AI fields are visible before review
- review accepts price input with long CDF values
- publish reaches `#success`

## Messaging flow

This messaging flow validates the buyer-to-seller conversation path on the live beta.

1. Use the seller flow to publish a fresh listing
2. Open the listing as the buyer tester
3. Tap `Envoyer un message`
4. Verify buyer OTP if needed
5. Send a buyer message
6. Open `Messages` as the seller
7. Reply from the seller thread
8. Confirm the buyer sees the reply without a manual refresh

Expected result:

- thread opens inside `/App`
- unread badge appears when the other side is off-thread
- reply lands in the open buyer thread

## Known beta limits

- demo OTP only
- no real payments
- chat refresh is polling-based, not websocket push

## Automated companions

Use these from the repo root:

- `npm run test:e2e:seller:beta`
- `npm run test:e2e:messages:beta`
- `npm run test:e2e:matrix:beta`
- `npm run test:e2e:beta`
