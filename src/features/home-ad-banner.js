// Match the destination's campaign to the same breakpoint as the supplied art.
const banner=document.querySelector('[data-home-ad]');
if(banner){
  const mobile=window.matchMedia('(max-width: 640px)'),desktopHref=banner.href;
  const update=()=>{banner.href=mobile.matches?banner.dataset.mobileHref:desktopHref;};
  const copy=banner.closest('.hero-copy');
  const widgets=[document.getElementById('donation-collapsible-widget'),document.getElementById('server-sticky-widget')];
  function fitBetweenWidgets(){
    copy.style.removeProperty('padding-inline-start');copy.style.removeProperty('padding-inline-end');
    // At compact widths the server tab shares the support tab's dock height.
    // Keep it below the ad even in short viewports or after rotating a phone.
    const server=widgets[1];
    if(server){
      if(innerWidth<1280){
        // The support tab is 190px high and sits 170px above the bottom edge.
        const support=widgets[0];
        const dockTop=support&&!support.classList.contains('is-collapsed')
          ?support.getBoundingClientRect().top:innerHeight-360;
        const top=Math.ceil(Math.max(dockTop,banner.getBoundingClientRect().bottom+12))+'px';
        widgets.filter(Boolean).forEach(widget=>widget.style.setProperty('--home-ad-widget-top',top));
      }else widgets.filter(Boolean).forEach(widget=>widget.style.removeProperty('--home-ad-widget-top'));
    }
    if(!window.matchMedia('(min-width: 1280px) and (max-width: 1499px)').matches)return;
    const box=copy.getBoundingClientRect();
    const gutters={left:0,right:0};
    widgets.forEach(widget=>{
      if(!widget||getComputedStyle(widget).display==='none')return;
      const rect=widget.getBoundingClientRect();
      const side=rect.left+rect.width/2<innerWidth/2?'left':'right';
      const overlap=side==='left'?rect.right-box.left:box.right-rect.left;
      if(overlap>0)gutters[side]=Math.max(gutters[side],Math.ceil(overlap+12));
    });
    copy.style.paddingInlineStart=gutters.left+'px';copy.style.paddingInlineEnd=gutters.right+'px';
  }
  update();
  fitBetweenWidgets();
  mobile.addEventListener('change',update);
  window.addEventListener('resize',fitBetweenWidgets);
  const observer=new MutationObserver(fitBetweenWidgets);
  widgets.filter(Boolean).forEach(widget=>observer.observe(widget,{attributes:true,attributeFilter:['class']}));
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['style']});
  const sizes=new ResizeObserver(fitBetweenWidgets);
  sizes.observe(banner);
  if(widgets[0])sizes.observe(widgets[0]);
  document.fonts?.ready.then(fitBetweenWidgets);
  if(document.documentElement.lang==='ru'){
    banner.querySelector('img').alt='Dudarev Motorsport — магазин симрейсингового оборудования. Промокод ASG.';
  }
}
