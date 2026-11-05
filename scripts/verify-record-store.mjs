import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { build } from "esbuild";

await build({
  entryPoints: ["src/record-store.ts", "src/launch-state.ts", "src/data.ts"],
  bundle: true, platform: "node", format: "esm", logLevel: "error",
  outdir: ".audit-tmp/record-store",
});
const { mergeRecordChanges, replaceRecordChanges, createRecordStore } = await import("../.audit-tmp/record-store/record-store.js");
const { loadLaunchState, LAUNCH_STORAGE_KEY } = await import("../.audit-tmp/record-store/launch-state.js");
const { recommendationDataset, rollSevenDayHistory } = await import("../.audit-tmp/record-store/data.js");
const now = new Date(2026, 10, 4, 12);
const blank = loadLaunchState(null, now);
const copy = (value) => structuredClone(value);
const edited = (base, slot, name, date = "2026-11-04") => {
  const next = copy(base);
  next.days.find((day) => day.date === date).todayLog[slot].protein = [name];
  return next;
};
let assertions = 0;
const check = (condition, message) => { assert.ok(condition, message); assertions++; };
const a = edited(blank, "Breakfast", "Chicken");
const b = edited(blank, "Dinner", "Tofu");
const merged = mergeRecordChanges(a, blank, b, now);
check(merged.status === "ok", "Independent meal-slot edits merge.");
check(merged.state.days[6].todayLog.Breakfast.protein[0] === "Chicken", "Existing tab A breakfast survives.");
check(merged.state.days[6].todayLog.Dinner.protein[0] === "Tofu", "Tab B dinner is added.");
check(blank.days[6].todayLog.Dinner.protein.length === 0, "Merge does not mutate the editor base.");
check(mergeRecordChanges(a, blank, edited(blank, "Breakfast", "Fish"), now).status === "conflict", "Same slot edits conflict.");
check(mergeRecordChanges(a, blank, a, now).status === "ok", "Same desired content is idempotent.");
const deleteA = copy(a);
deleteA.days[6].todayLog.Breakfast = copy(blank.days[6].todayLog.Breakfast);
check(mergeRecordChanges(a, a, deleteA, now).state.days[6].todayLog.Breakfast.protein.length === 0, "Deletion is an explicit meal edit.");
check(mergeRecordChanges(edited(a, "Breakfast", "Fish"), a, deleteA, now).status === "conflict", "Stale deletion cannot erase a new meal.");
const oldDateEdit = edited(blank, "Breakfast", "Chicken", "2026-10-29");
const midnight = new Date(2026, 10, 5, 0, 0, 5);
check(mergeRecordChanges(blank, blank, oldDateEdit, midnight).status === "expired", "An old date edit fails after midnight.");
check(mergeRecordChanges(blank, blank, edited(blank, "Breakfast", "Chicken", "2026-11-03"), midnight).status === "ok", "A still eligible past date saves after midnight.");
const nextDayBase = { ...blank, days: rollSevenDayHistory(blank.days, midnight) };
check(mergeRecordChanges(blank, blank, edited(nextDayBase, "Breakfast", "New day", "2026-11-05"), midnight).state.days[6].todayLog.Breakfast.protein[0] === "New day", "A newly rolled day can be saved from yesterday's editor base.");
const atomicEdit = edited(oldDateEdit, "Dinner", "Fish");
const expired = mergeRecordChanges(blank, blank, atomicEdit, midnight);
check(expired.status === "expired" && !expired.state.days[5].todayLog.Dinner.protein.length, "Expired edit rejects the entire change set.");
const profileA = copy(blank);
profileA.profile.avoidTags = ["Dairy"];
const profileB = copy(blank);
profileB.profile.preferenceTags = ["Japanese"];
const profileMerged = mergeRecordChanges(profileA, blank, profileB, now);
check(profileMerged.status === "ok" && profileMerged.state.profile.avoidTags[0] === "Dairy" && profileMerged.state.profile.preferenceTags[0] === "Japanese", "Independent preference fields merge.");
const profileConflict = copy(blank);
profileConflict.profile.avoidTags = ["Soy"];
check(mergeRecordChanges(profileA, blank, profileConflict, now).status === "conflict", "Conflicting avoids require review.");
const plan = (id, mealId) => ({ id, mealId, createdAt: now.toISOString() });
const planA = copy(blank);
planA.plannedMeals = [plan("a", recommendationDataset[0].id)];
const planB = copy(blank);
planB.plannedMeals = [plan("b", recommendationDataset[1].id)];
check(mergeRecordChanges(planA, blank, planB, now).state.plannedMeals.length === 2, "Independent plan additions merge.");
planB.plannedMeals[0].mealId = recommendationDataset[0].id;
check(mergeRecordChanges(planA, blank, planB, now).status === "conflict", "Duplicate plan additions cannot silently disappear.");
const fullPlans = copy(blank);
fullPlans.plannedMeals = recommendationDataset.slice(0, 12).map((meal, i) => plan(`full-${i}`, meal.id));
planB.plannedMeals[0].mealId = recommendationDataset[12].id;
check(mergeRecordChanges(fullPlans, blank, planB, now).status === "conflict", "Concurrent additions cannot silently drop a plan at capacity.");
check(replaceRecordChanges(a, blank, blank, now).status === "conflict", "Stale clear cannot erase new records.");
check(replaceRecordChanges(a, a, blank, now).status === "ok", "Reviewed current state can be cleared.");
const selectionOnly = copy(a);
selectionOnly.selectedDayId = "2026-11-03";
check(replaceRecordChanges(selectionOnly, a, blank, now).status === "ok", "Day selection is not a data conflict.");
const values = new Map([[LAUNCH_STORAGE_KEY, JSON.stringify(a)]]);
const legacyStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
const unavailable = createRecordStore({ indexedDB: null, legacyStorage, clock: () => now });
check((await unavailable.load()).status === "save-error", "Unavailable database is explicitly reported.");
check((await unavailable.load()).state.days[6].todayLog.Breakfast.protein[0] === "Chicken", "Read fallback retains legacy records.");
check((await unavailable.commit(a, b)).status === "save-error", "Unavailable database does not pretend to save.");
check(values.has(LAUNCH_STORAGE_KEY), "Failed database initialization never removes legacy backup.");

// Run this generated page against Vite for real IndexedDB transaction coverage.
// It uses unique disposable DB names and in-memory legacy data, never app storage.
await mkdir(".audit-tmp", { recursive: true });
await writeFile(".audit-tmp/record-store-browser.html", `<!doctype html><html lang="en"><meta charset="utf-8"><title>Record store transaction verification</title><style>body{font:16px system-ui;margin:32px;line-height:1.6}pre{white-space:pre-wrap}</style><h1>Record store transaction verification</h1><pre id="report">Running…</pre><script type="module">
import { createRecordStore } from '/src/record-store.ts';
import { loadLaunchState, LAUNCH_STORAGE_KEY } from '/src/launch-state.ts';
import { rollSevenDayHistory } from '/src/data.ts';
const report = document.querySelector('#report');
const passed = [];
const check = (ok, name) => { if (!ok) throw new Error(name); passed.push(name); report.textContent = passed.map(x => 'PASS ' + x).join('\\n'); };
let now = new Date(2026,10,4,23,59,50);
const blank = loadLaunchState(null, now);
const edit = (base, slot, name, date = '2026-11-04') => { const next=structuredClone(base);next.days.find(d=>d.date===date).todayLog[slot].protein=[name];return next; };
const legacy = new Map([[LAUNCH_STORAGE_KEY, JSON.stringify(edit(blank,'Lunch','Legacy tofu'))]]);
let blockRemoval = false;
const storage = {getItem:k=>legacy.get(k)??null,setItem:(k,v)=>legacy.set(k,v),removeItem:k=>{if(blockRemoval)throw new Error('blocked');legacy.delete(k);}};
const databaseName = 'mealhatch-records-test-' + crypto.randomUUID();
const a = createRecordStore({databaseName,legacyStorage:storage,clock:()=>now});
const b = createRecordStore({databaseName,legacyStorage:storage,clock:()=>now});
try {
 const [firstA,firstB]=await Promise.all([a.load(),b.load()]);
 check(firstA.status==='ok'&&firstB.status==='ok'&&firstA.state.days[6].todayLog.Lunch.protein[0]==='Legacy tofu'&&firstB.state.days[6].todayLog.Lunch.protein[0]==='Legacy tofu','Concurrent initialization migrates one shared legacy state');
 check(!legacy.has(LAUNCH_STORAGE_KEY),'Legacy snapshot retires after successful migration');
 const [savedA,savedB]=await Promise.all([a.commit(firstA.state,edit(firstA.state,'Breakfast','Chicken')),b.commit(firstB.state,edit(firstB.state,'Dinner','Fish'))]);
 const both=(await a.load()).state;
 check(savedA.status==='ok'&&savedB.status==='ok'&&both.days[6].todayLog.Breakfast.protein[0]==='Chicken'&&both.days[6].todayLog.Dinner.protein[0]==='Fish','Concurrent stale tab edits preserve both meal slots');
 const [sameA,sameB]=await Promise.all([a.commit(both,edit(both,'Breakfast','Egg')),b.commit(both,edit(both,'Breakfast','Beans'))]);
 check([sameA.status,sameB.status].filter(x=>x==='ok').length===1&&[sameA.status,sameB.status].includes('conflict'),'Concurrent edits to the same meal yield one explicit conflict');
 const fresh=(await a.load()).state;
 now = new Date(2026,10,5,0,0,5);
 const expired=await b.commit(fresh,edit(fresh,'Breakfast','Expired','2026-10-29'));
 check(expired.status==='expired'&&(await a.load()).state.days.every(d=>d.date!=='2026-10-29'),'Transaction-time date rejects an expired edit');
 const nextDay = {...fresh, days:rollSevenDayHistory(fresh.days,now)};
 const nextDaySave = await a.commit(fresh,edit(nextDay,'Breakfast','New-day breakfast','2026-11-05'));
 check(nextDaySave.status==='ok'&&(await b.load()).state.days[6].todayLog.Breakfast.protein[0]==='New-day breakfast','A new calendar day absent from the earlier snapshot saves correctly');
 const current=(await a.load()).state;
 const originalPut=IDBObjectStore.prototype.put;
 IDBObjectStore.prototype.put=function(...args){if(this.transaction.db.name===databaseName){this.transaction.abort();throw new Error('Forced abort');}return originalPut.apply(this,args);};
 const aborted=await a.commit(current,edit(current,'Dinner','Should not save','2026-11-05'));
 IDBObjectStore.prototype.put=originalPut;
 check(aborted.status==='save-error'&&!(await a.load()).state.days[6].todayLog.Dinner.protein.length,'Transaction abort is a save error and leaves prior data intact');
 const prior=(await a.load()).state;
 await a.commit(prior,edit(prior,'Dinner','New record','2026-11-05'));
 check((await b.replace(prior,loadLaunchState(null,now))).status==='conflict','Stale clear is rejected');
 legacy.set(LAUNCH_STORAGE_KEY,JSON.stringify(firstA.state));blockRemoval=true;
 const clearBase=(await a.load()).state;
 check((await a.replace(clearBase,loadLaunchState(null,now))).status==='ok','Current reviewed state can be cleared');
 check(!(await b.load()).state.days.some(d=>Object.values(d.todayLog).some(m=>m.protein.length)),'Retained legacy snapshot cannot resurrect cleared records');
 report.textContent += '\\n\\nPASS all ' + passed.length + ' real IndexedDB checks';
} catch(error) { report.textContent += '\\nFAIL ' + error.stack; }
finally { await a.close();await b.close();indexedDB.deleteDatabase(databaseName); }
</script></html>`);
console.log(JSON.stringify({ status: "passed", assertions, browserHarness: ".audit-tmp/record-store-browser.html" }, null, 2));
