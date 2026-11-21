import {selectRandomTrackBackgroundFile} from '/src/features/server-status/track-background.js';

const layouts = new WeakMap();
const headerTracks = new WeakMap();
const trackKey = 'asgProfileHeaderTrack';

function headerTrack(document) {
  if(headerTracks.has(document))return headerTracks.get(document);
  let previous;
  try{previous=document.defaultView.sessionStorage.getItem(trackKey);}catch{}
  const track=selectRandomTrackBackgroundFile(Math.random,previous).replace(/\.jpg$/,'.webp');
  try{document.defaultView.sessionStorage.setItem(trackKey,track.replace(/\.webp$/,'.jpg'));}catch{}
  headerTracks.set(document,track);
  return track;
}

export function profileHeaderImage(document) {
  return `url("/assets/v2-light/tracks/${headerTrack(document)}")`;
}

export function setProfileLayout(root, hero, modern, text) {
  const workspace=root.querySelector('.profile-workspace');
  const main=workspace?.querySelector('.profile-main');
  const analysis=main?.querySelector('.profile-analysis');
  const discipline=hero.querySelector('.profile-discipline');
  const stats=main?.querySelector('.profile-stat-grid');
  if(!workspace || !main || !analysis || !stats || !discipline)return;

  root.ownerDocument.body.classList.toggle('studio-refreshed',modern);
  const previous=layouts.get(hero);
  if(!modern){
    if(!previous)return;
    for(const [marker,node] of previous.origins)marker.replaceWith(node);
    previous.summary.remove();
    previous.photo.remove();
    layouts.delete(hero);
    return;
  }
  if(previous)return;

  const doc=root.ownerDocument;
  const summary=doc.createElement('section');
  summary.className='studio-key-metrics';
  summary.setAttribute('aria-label',text('Ключевые показатели пилота','Driver highlights'));
  const highlights=[...stats.querySelectorAll('[data-profile-key-metric]')];
  const origins=[hero,analysis,discipline,...highlights].map(node=>{
    const marker=doc.createComment('Classic profile layout');
    node.before(marker);
    return [marker,node];
  });
  const photo=doc.createElement('div');
  photo.className='studio-hero-photo';
  photo.setAttribute('aria-hidden','true');
  photo.style.setProperty('--studio-hero-image',profileHeaderImage(doc));
  hero.prepend(photo);
  workspace.before(hero,summary);
  summary.append(...highlights);
  main.prepend(analysis);
  stats.after(discipline);
  layouts.set(hero,{origins,summary,photo});
}
