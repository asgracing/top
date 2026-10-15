import {paginationPages} from '../models.js?v=20261013delivery1';

// Shared page controls for lists, tables and the recent-races dialog.
export function renderPagination({name,page,total,size=10,tx,previous='',next=''}) {
  const max=Math.max(1,Math.ceil(total/size));
  page=Math.max(1,Math.min(max,Math.trunc(page)||1));
  const links=paginationPages(page,max).map(value=>value===null
    ? '<span class="page-gap" aria-hidden="true">…</span>'
    : `<button type="button" data-pagination-page="${value}" aria-label="${tx('Страница','Page')} ${value}"${value===page?' aria-current="page" class="is-current"':''}${!total?' disabled':''}>${value}</button>`).join('');
  return `<div class="page-pagination" data-pagination="${name}"><span>${total?(page-1)*size+1:0}–${Math.min(page*size,total)} / ${total}</span><nav class="pagination" aria-label="${tx('Страницы','Pages')}"><button type="button" ${previous} aria-label="${tx('Предыдущая страница','Previous page')}"${page===1?' disabled':''}>‹</button><span class="pagination-pages">${links}</span><button type="button" ${next} aria-label="${tx('Следующая страница','Next page')}"${page===max?' disabled':''}>›</button></nav><form class="page-jump" data-pagination-jump><label><span>${tx('Страница','Page')}</span><input name="page" aria-label="${tx('Номер страницы','Page number')}" type="number" min="1" max="${max}" step="1" inputmode="numeric" required value="${page}"${!total?' disabled':''}><span>${tx('из','of')} ${max}</span></label><button type="submit"${!total?' disabled':''}>${tx('Перейти','Go')}</button></form></div>`;
}

export function bindPagination(root,onPage) {
  const go=async(pager,page,focusInput=false)=>{
    const name=pager.dataset.pagination;
    await onPage(name,page);
    const current=root.querySelector(`[data-pagination="${name}"]`);
    current?.querySelector(focusInput?'input[name="page"]':'[aria-current="page"]')?.focus({preventScroll:true});
  };
  root.addEventListener('click',event=>{
    const button=event.target.closest('[data-pagination-page]');
    if(!button||button.disabled||!root.contains(button))return;
    const pager=button.closest('[data-pagination]');
    void go(pager,Number(button.dataset.paginationPage));
  });
  root.addEventListener('submit',event=>{
    const form=event.target.closest('[data-pagination-jump]');
    if(!form||!root.contains(form))return;
    event.preventDefault();
    const input=form.elements.namedItem('page');
    if(input.disabled||!form.reportValidity())return;
    void go(form.closest('[data-pagination]'),input.valueAsNumber,true);
  });
}
