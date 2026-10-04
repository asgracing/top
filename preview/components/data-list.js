import {copy,el,observeContent} from "./dom.js?v=20261004p2";

// A compact mobile view of each table. The original render, filters and row
// actions remain the source of truth. Extra values are available on demand.
export function installDataLists(root) {
  const states=new WeakMap();
  function enhance(table){
    const headers=[...table.querySelectorAll("thead th")].map(th=>th.textContent.trim());
    const rows=[...table.querySelectorAll("tbody tr")];
    if(!headers.length||!rows.length)return;
    let state=states.get(table);
    if(!state){
      const list=el("div","preview-data-list");const pager=el("div","preview-table-pager");
      table.after(list,pager);table.classList.add("preview-enhanced-table");
      state={list,pager,page:0,signature:""};states.set(table,state);
      const prev=el("button","preview-button",copy("← Назад","← Previous"));const next=el("button","preview-button",copy("Далее →","Next →"));const label=el("span","preview-muted");prev.type=next.type="button";
      prev.addEventListener("click",()=>{state.page--;paint(table);});next.addEventListener("click",()=>{state.page++;paint(table);});pager.append(prev,label,next);state.prev=prev;state.next=next;state.label=label;
    }
    const signature=rows.map(row=>row.textContent).join("\n");
    if(state.signature===signature)return;
    state.signature=signature;state.page=0;paint(table);
  }
  function paint(table){
    const state=states.get(table);if(!state)return;
    const rows=[...table.querySelectorAll("tbody tr")],heads=[...table.querySelectorAll("thead th")].map(th=>th.textContent.trim());
    const size=10,start=state.page*size,end=start+size;
    rows.forEach((row,index)=>{row.hidden=index<start||index>=end;});
    const driverTable=Boolean(table.querySelector(".driver-name,.driver-link"))&&!table.closest("#driver-races-table");
    const list=[];
    for(const row of rows.slice(start,end)){
      const cells=[...row.children];
      if(cells.length===1){list.push(el("p","preview-empty",row.textContent));continue;}
      const item=el("details","preview-list-item preview-row-details");
      const summary=el("summary","preview-list-summary");
      const brief=el("div","preview-list-brief");
      // Result lists use date/track; driver lists use position/name; cars use
      // model/races. Always retain the first fields instead of hiding data.
      const mainIndices=[0,1];
      for(const index of mainIndices){if(!cells[index])continue;const field=el("div",index===1?"preview-list-title":"preview-list-context");field.append(...[...cells[index].childNodes].map(node=>node.cloneNode(true)));brief.append(field);}
      const values=el("div","preview-list-values");
      const points=heads.findIndex(h=>/^(очки|points|total|итого)/i.test(h)),safety=heads.findIndex(h=>/^(sr|safety)/i.test(h));
      const participants=heads.findIndex(h=>/пилотов|participants|drivers/i.test(h));
      const finish=heads.findIndex(h=>/^(поз|финиш|position|finish)/i.test(h));
      const bestLap=heads.findIndex(h=>/круг|best lap/i.test(h));
      const metrics=driverTable?[points>=0?points:2,safety>=0?safety:heads.length-1]:[participants>=0?participants:finish>=0?finish:2,bestLap>=0?bestLap:3];
      for(const index of [...new Set(metrics)].filter(i=>i<cells.length&&i>1)){
        const field=el("div","preview-list-value");field.append(el("span","preview-label",heads[index]));const value=el("span");value.append(...[...cells[index].childNodes].map(node=>node.cloneNode(true)));field.append(value);values.append(field);
      }
      const fields=el("dl","preview-row-fields");
      cells.forEach((cell,index)=>{const field=el("div");field.append(el("dt","preview-label",heads[index]||""));const value=el("dd");value.append(...[...cell.childNodes].map(node=>node.cloneNode(true)));field.append(value);fields.append(field);});
      if(row.matches(".is-interactive-row,[data-race-id],[data-driver-id],[data-public-id]")){
        const open=el("button","preview-text-button",copy("Открыть подробности →","Open details →"));open.type="button";open.addEventListener("click",()=>row.click());fields.append(open);
      }
      summary.append(brief,values);summary.setAttribute('aria-label',`${copy('Раскрыть все данные','Expand all values')}: ${cells[1]?.textContent.trim()||cells[0]?.textContent.trim()}`);item.append(summary,fields);list.push(item);
    }
    state.list.replaceChildren(...list);state.pager.hidden=rows.length<=size;
    state.prev.disabled=state.page<=0;state.next.disabled=end>=rows.length;
    state.label.textContent=`${start+1}–${Math.min(end,rows.length)} / ${rows.length}`;
  }
  for(const target of root.querySelectorAll(".table-wrap,#championship-standings,.clubs-rating-embed,#championship-race-results"))observeContent(target,()=>{
    // Ignore this adapter's own nodes. Rebuild only when source rows change.
    target.querySelectorAll("table").forEach(enhance);
  });
}
