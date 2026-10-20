import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const html=fs.readFileSync(fileURLToPath(new URL('../index.html',import.meta.url)),'utf8');
test('ERP messages only accepted from actual same-origin parent',()=>{
 assert.match(html,/event\.source !== window\.parent/);
 assert.match(html,/event\.origin !== window\.location\.origin/);
 assert.match(html,/data\.type === 'HG_ERP_SESSION'/);
 assert.match(html,/typeof data\.session\.name === 'string'/);
 assert.doesNotMatch(html,/window\.parent\.postMessage\([^;]*,\s*'\*'/);
});
test('quotation original workflow and PDF affordances retained',()=>{
 assert.match(html,/function applyPortalSession/);
 assert.match(html,/autoFillContactFromSession/);
 assert.match(html,/function initPortalBinding/);
 assert.match(html,/HG_MODULE_READY/);
 assert.ok(/(pdf|PDF|jspdf|print)/.test(html));
});
