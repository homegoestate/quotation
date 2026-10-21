import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const fragment=(start,end)=>{
 const a=html.indexOf(start),b=html.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'expected source anchors '+start);
 return html.slice(a,b);
};
const fn=fragment('function applyPortalSession(session) {','// Display/attribution hint only.');
const fromStorage=fragment('function sessionFromStorage() {','function getCurrentOperator()');
function storage(initial={},fails=false){
 const data=new Map(Object.entries(initial));
 return {data,getItem:key=>data.get(key)??null,removeItem:key=>data.delete(key),
   setItem(key,value){if(fails)throw Object.assign(new Error('quota exceeded'),{name:'QuotaExceededError'});data.set(key,String(value));}};
}
function setup({fullLocal=true}={}){
 const quoteOriginal='KEEP-ORIGINAL-QUOTE-PDF-RECORDS';
 const local=storage({
   HG_QUOTATION_RECORDS_V1:quoteOriginal,
   HG_QUOTATION_AUDIT_V1:'KEEP-ORIGINAL-QUOTE-AUDIT',
   HG_ERP_SESSION_V1:'OUTDATED-OTHER-STAFF'
 },fullLocal);
 const tab=storage();
 const calls=[];
 const ctx=vm.createContext({
   sessionStorage:tab,localStorage:local,erpSession:null,
   ERP_SESSION_KEY:'HG_ERP_SESSION_V1',
   resolveEmployeeByName:(name)=>({name,role:'會計',roleCode:'ACCOUNTING',isManager:false,canApprove:false}),
   updatePortalBanner:()=>calls.push('banner'),
   autoFillContactFromSession:()=>calls.push('contact'),
   updateMetaDisplay:()=>calls.push('meta')
 });
 vm.runInContext(fn,ctx);vm.runInContext(fromStorage,ctx);
 return {ctx,local,tab,calls};
}
test('ERP display session does not rewrite quota-limited localStorage; quote records and audit preserved',()=>{
 const {ctx,local,tab,calls}=setup();
 ctx.applyPortalSession({name:'楊雅婷',roleCode:'ACCOUNTING',sessionId:'s123'});
 assert.equal(local.getItem('HG_ERP_SESSION_V1'),null);
 assert.equal(local.getItem('HG_QUOTATION_RECORDS_V1'),'KEEP-ORIGINAL-QUOTE-PDF-RECORDS');
 assert.equal(local.getItem('HG_QUOTATION_AUDIT_V1'),'KEEP-ORIGINAL-QUOTE-AUDIT');
 assert.equal(JSON.parse(tab.getItem('HG_ERP_SESSION_V1')).name,'楊雅婷');
 assert.ok(tab.getItem('HG_ERP_SESSION_V1').length<500);
 assert.deepEqual(calls,['banner','contact','meta']);
});
test('quotation reload reads tab-scoped ERP hint, never a stale localStorage role or name',()=>{
 const {ctx,local,tab}=setup({fullLocal:false});
 tab.setItem('HG_ERP_SESSION_V1',JSON.stringify({name:'楊雅婷',role:'會計',roleCode:'ACCOUNTING'}));
 const restored=ctx.sessionFromStorage();
 assert.equal(restored.name,'楊雅婷');
 assert.equal(restored.source,'sessionStorage'); 
});
test('same-origin parent origin verification remains intact',()=>{
 assert.match(html,/event\.source !== window\.parent/);
 assert.match(html,/event\.origin !== window\.location\.origin/);
 assert.match(html,/window\.parent\.postMessage\(\{ type: 'HG_MODULE_READY', module: 'quotation' \}, window\.location\.origin\)/);
});
test('quotation and audit record storage code has not been removed',()=>{
 assert.match(html,/localStorage\.setItem\(QUOTE_RECORDS_KEY, JSON\.stringify\(records\)\)/);
 assert.match(html,/localStorage\.setItem\(QUOTE_AUDIT_KEY, JSON\.stringify\(logs\)\)/);
 assert.match(html,/downloadQuotationBackup\(records, getGlobalAudit\(\), 'records-save-failed'\)/);
});
