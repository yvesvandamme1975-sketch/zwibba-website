import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import sharp from 'sharp';
import { StoryImageController } from '../../src/share/story-image.controller';
import { StoryImageService } from '../../src/share/story-image.service';

process.env.R2_PUBLIC_BASE_URL = 'https://cdn.example.com';

test('public story endpoint renders on demand with no-store, hides private listings and handles photo failures', async () => {
  const photo=readFileSync(new URL('../fixtures/sample-product.png',import.meta.url));
  let visible=true; let unavailable=false; let downloads=0;
  const service=new StoryImageService({
    listing:{findUnique:async({where}:any)=>where.slug==='missing'?null:{id:'l1',draftId:'d1',moderationStatus:visible?'approved':'pending',lifecycleStatus:'active',title:'Bague',priceAmount:5,priceCurrency:'EUR',area:'Bruxelles'}},
    draft:{findUnique:async()=>({photos:[{publicUrl:'https://cdn.example.com/photo.jpg',uploadStatus:'uploaded'}]})},
  } as any,{putBuffer:()=>assert.fail('story must not be stored')} as any,{fetchImpl:(async()=>{downloads++;return unavailable?new Response('failed',{status:503}):new Response(photo);}) as any});
  const module=await Test.createTestingModule({controllers:[StoryImageController],providers:[{provide:StoryImageService,useValue:service}]}).compile();
  const app=module.createNestApplication();await app.init();
  try{
    assert.equal(downloads,0);
    const result=await request(app.getHttpServer()).get('/share/bague/story.png').expect(200).expect('Content-Type',/image\/png/).expect('Cache-Control','no-store');
    const meta=await sharp(result.body).metadata();assert.equal(meta.width,1080);assert.equal(meta.height,1920);assert.equal(downloads,1);
    visible=false;const hidden=await request(app.getHttpServer()).get('/share/bague/story.png').expect(404);assert.equal(downloads,1);
    const missing=await request(app.getHttpServer()).get('/share/missing/story.png').expect(404);assert.equal(downloads,1);
    assert.deepEqual(hidden.body,missing.body);assert.equal(hidden.body.message,'Annonce indisponible.');assert.doesNotMatch(JSON.stringify(hidden.body),/l1|listing_not_public/);
    visible=true;unavailable=true;await request(app.getHttpServer()).get('/share/bague/story.png').expect(503);assert.equal(downloads,2);
  }finally{await app.close();}
});
