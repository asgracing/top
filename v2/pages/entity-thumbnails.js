// Visible roster avatars only; failed or absent images keep the initials.
export function nameInitials(name, team=false) {
  const words=String(name||'').replace(/\[[^\]]*\]/g,' ').split(/\s+/)
    .map(word=>word.match(/[\p{L}\p{N}]+/u)?.[0]).filter(Boolean);
  return (team?words.slice(0,3):words.length>1?[words[0],words.at(-1)]:words.slice(0,1))
    .map(word=>Array.from(word)[0]).join('').toLocaleUpperCase()||'?';
}

export function createEntityThumbnails({root,loadAvatar}) {
  const cache=new Map(),queue=[],queued=new Set();let active=0,closed=false;
  function install(node,url) {
    if(!url||!node.isConnected||node.querySelector('img'))return;
    const image=document.createElement('img');image.alt='';image.hidden=true;
    image.decoding='async';image.addEventListener('load',()=>{image.hidden=false;},{once:true});
    image.addEventListener('error',()=>image.remove(),{once:true});node.append(image);image.src=url;
  }
  function apply(id,url) {
    root.querySelectorAll('[data-entity-avatar]').forEach(node=>{if(node.dataset.entityAvatar===id)install(node,url);});
  }
  function drain() {
    while(!closed&&active<4&&queue.length) {
      const id=queue.shift();active++;
      Promise.resolve().then(()=>loadAvatar(id)).catch(()=>null).then(url=>{
        cache.set(id,url);if(!closed)apply(id,url);
      }).finally(()=>{active--;drain();});
    }
  }
  function request(node) {
    const id=node.dataset.entityAvatar;
    if(cache.has(id)){install(node,cache.get(id));return;}
    if(queued.has(id))return;queued.add(id);queue.push(id);drain();
  }
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);request(entry.target);}
  },{root:null,rootMargin:'80px'});
  return {
    scan(){if(closed)return;observer.disconnect();root.querySelectorAll('[data-entity-avatar]').forEach(node=>{
      cache.has(node.dataset.entityAvatar)?install(node,cache.get(node.dataset.entityAvatar)):observer.observe(node);
    });},
    destroy(){closed=true;observer.disconnect();queue.length=0;cache.clear();}
  };
}
