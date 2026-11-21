export const ACCENTS=['#ff6349','#eec979','#4fd8e9','#b18aff','#ff78d3','#b5ef70'];

export function passSettings(settings) {
  return {
    pass_style:['carbon','holographic','classic'].includes(settings?.pass_style)?settings.pass_style:'carbon',
    pass_accent:ACCENTS.includes(settings?.pass_accent)?settings.pass_accent:'#b18aff',
    pass_motto:typeof settings?.pass_motto==='string'?settings.pass_motto.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,48):'RACE. LEARN. REPEAT.',
    pass_visible:settings?.pass_visible ?? settings?.pass_style!=='hidden',
  };
}

export function passProfile(profile,root) {
  const team=profile.team;
  const displayedTeam=root.querySelector('.profile-affiliations > span:last-child a')?.textContent.trim();
  return {...profile,
    avatar:root.querySelector('.profile-portrait img')?.src,
    teamName:displayedTeam || (typeof team==='string'?team:team?.name ?? team?.display_name ?? ''),
  };
}

const escape=value=>String(value??'—').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
const read=(profile,key)=>profile[key] ?? profile.summary?.[key] ?? '—';
const profileUrl=profile=>new URL('/driver/?id='+encodeURIComponent(profile.public_id),location.origin).href;
const score=value=>Number.isFinite(value)?String(value):'—';
const initials=profile=>String(profile.driver??'ASG').split(/\s+/).slice(0,2).map(word=>word[0]).join('');

function ratings(profile) {
  const elo=read(profile,'elo'), sr=read(profile,'safety_rating');
  const classId=Number(profile.elo_category_id)||([1350,1250,1150,1050,950].findIndex(value=>elo>=value)+1 || 6);
  const safety=sr>=5?'A':sr>=2.5?'B':'C';
  return [
    ['ELO',score(elo),'C'+classId,'elo-'+classId],
    ['SR',Number.isFinite(sr)?sr.toFixed(2):'—',safety,'sr-'+safety.toLowerCase()],
  ];
}
const totals=(profile,text)=>[
  [text('Гонки','Races'),read(profile,'races')],[text('Победы','Wins'),read(profile,'wins')],
  [text('Подиумы','Podiums'),read(profile,'podiums')],[text('Очки','Points'),read(profile,'points')],
];

export function passCard({profile,settings,side,text,large=false}) {
  const top=title=>`<div class="pass-top"><b>ASG <i>RACING</i></b><span>${title}</span></div>`;
  const avatar=profile.avatar?`<img src="${escape(profile.avatar)}" alt="">`:`<span class="pass-avatar" aria-hidden="true">${escape(initials(profile))}</span>`;
  const raceNumber='#'+(profile.race_number??'—');
  return `<div class="racing-pass${large?' pass-large':''}" data-card-style="${settings.pass_style}" style="--pass-accent:${settings.pass_accent}">
    <div class="pass-front"${side==='front'?'':' hidden'}>
      ${top('RACING PASS')}<div class="pass-identity">${avatar}<div><strong>${escape(profile.driver)}</strong><small>${escape(profile.teamName)}</small></div><b class="pass-number">${escape(raceNumber)}</b></div>
      <div class="pass-ratings">${ratings(profile).map(([label,value,category,css])=>`<div class="pass-rating ${css}"><span>${label}</span><b>${value}</b><span class="pass-rating-class">${category}</span></div>`).join('')}</div>
      <div class="pass-bottom"><span>${escape(settings.pass_motto)}</span><b>ASGRACING.RU</b></div>
    </div>
    <div class="pass-back"${side==='back'?'':' hidden'}>
      ${top(text('РЕЗУЛЬТАТЫ','RESULTS'))}<strong class="pass-back-name">${escape(profile.driver)} <small>${escape(raceNumber)}</small></strong>
      <dl class="pass-record">${totals(profile,text).map(([label,value])=>`<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>
      <div class="pass-bottom"><a href="${escape(profileUrl(profile))}">${text('Публичный профиль','Public profile')} ↗</a><b>ASGRACING.RU</b></div>
    </div></div>`;
}

const sideButton=(face,side,text)=>`<button class="button" type="button" data-pass-side="${face}" aria-pressed="${side===face}">${face==='front'?text('Лицевая сторона','Front'):text('Обратная сторона','Back')}</button>`;

export function passMarkup({profile,settings,side,owner,advanced,text}) {
  const styles={carbon:text('Карбон','Carbon'),holographic:text('Голографический','Holographic'),classic:text('Гоночная классика','Racing classic')};
  if(!advanced)styles.hidden=text('Скрыть из профиля','Hide from profile');
  return `<div class="profile-pass-toolbar">${sideButton('front',side,text)}${sideButton('back',side,text)}</div>
    <div data-pass-preview>${passCard({profile,settings,side,text,large:true})}</div>
    ${owner?`<div class="studio-card-controls"><label>${text('Материал','Material')}
    <select id="pass-style">${Object.entries(styles).map(([id,label])=>`<option value="${id}"${id===(advanced||settings.pass_visible?settings.pass_style:'hidden')?' selected':''}>${label}</option>`).join('')}</select></label>
    ${advanced?`<fieldset class="studio-colors"><legend>${text('Цвет акцента','Accent colour')}</legend>
    ${ACCENTS.map(color=>`<input type="radio" name="pass-accent" aria-label="${color}" value="${color}" style="--swatch:${color}"${color===settings.pass_accent?' checked':''}>`).join('')}</fieldset>
    <label>${text('Гоночная фраза','Racing motto')} <input id="pass-motto" type="text" maxLength="48" value="${escape(settings.pass_motto)}"></label>
    <label><input id="pass-visible" type="checkbox"${settings.pass_visible?' checked':''}>${text('Показывать в профиле','Show on profile')}</label>`:''}
    <div class="profile-pass-toolbar"><button class="button primary" type="button" data-save-pass>${text('Сохранить','Save')}</button>
    <button class="button" type="button" data-export-pass>${text('Скачать PNG','Download PNG')}</button></div></div>`:''}`;
}

const mounted=new WeakMap();
export function mountSidebarPass({root,profile,appearance,owner,text}) {
  const sidebar=root.querySelector('.profile-sidebar');
  if(!sidebar || !profile)return;
  const settings=passSettings(appearance?.effect);
  let panel=sidebar.querySelector('.studio-pass-panel');
  if(!['pro','admin'].includes(appearance?.tier) || !settings.pass_visible){panel?.remove();return;}
  const key=JSON.stringify([profile.public_id,profile.avatar,profile.teamName,owner,settings]);
  if(panel && mounted.get(panel)===key)return;
  if(!panel){
    panel=root.ownerDocument.createElement('section');
    panel.className='panel studio-pass-panel';
    sidebar.prepend(panel);
  }
  mounted.set(panel,key);
  let side='front';
  const render=()=>{
    panel.innerHTML=`<div class="panel-head"><h2>${text('Карточка пилота','Driver card')}</h2><span>${appearance.tier==='admin'?'ADMIN':'PRO'}</span></div>
      ${passCard({profile,settings,side,text})}<div class="studio-pass-actions">${sideButton(side==='front'?'back':'front',side,text)}
      ${owner?`<a class="button" href="?id=${encodeURIComponent(profile.public_id)}&amp;profileTab=paddock&amp;paddock=pass&amp;passSide=${side}">${text('Настроить','Edit')} ↗</a>`:''}</div>`;
  };
  side=root.dataset.passSide==='back' || new URLSearchParams(location.search).get('passSide')==='back'?'back':'front';
  panel.onclick=event=>{
    const flip=event.target.closest('[data-pass-side]');
    if(!flip)return;
    side=flip.dataset.passSide;
    root.dataset.passSide=side;
    root.dispatchEvent(new CustomEvent('profile-pass-side',{detail:side}));
    render();
    panel.querySelector('[data-pass-side]').focus({preventScroll:true});
  };
  render();
}

async function avatarImage(url) {
  if(!url)return null;
  const image=new Image();
  image.crossOrigin='anonymous';
  image.src=url;
  try{await image.decode();return image;}catch{return null;}
}

export async function exportPass({profile,settings,side,text,download,preview}) {
  const canvas=document.createElement('canvas');
  canvas.width=1200;canvas.height=756;
  const c=canvas.getContext('2d'),accent=settings.pass_accent;
  const gradient=c.createLinearGradient(0,0,1200,756);
  gradient.addColorStop(0,settings.pass_style==='classic'?'#262222':'#1a2438');
  gradient.addColorStop(.54,settings.pass_style==='holographic'?'#302844':'#142032');
  gradient.addColorStop(1,settings.pass_style==='holographic'?'#10383b':'#090f18');
  c.fillStyle=gradient;c.fillRect(0,0,1200,756);
  if(settings.pass_style==='classic'){
    c.strokeStyle='#ffffff0b';
    for(let x=-756;x<1200;x+=14){c.beginPath();c.moveTo(x,0);c.lineTo(x+756,756);c.stroke();}
  }
  c.strokeStyle=accent;c.lineWidth=2;c.strokeRect(23,23,1154,710);
  const write=(value,x,y,size,color='#ecf2fb',weight=600,width=1080)=>{
    let fontSize=size;
    c.font=`${weight} ${fontSize}px Arial`;
    while(c.measureText(String(value)).width>width && fontSize>15)c.font=`${weight} ${--fontSize}px Arial`;
    c.fillStyle=color;c.fillText(String(value),x,y,width);
  };
  const plate=(x,y,w,h,border)=>{
    c.beginPath();c.roundRect(x,y,w,h,12);c.fillStyle='#0b1420cc';c.fill();c.strokeStyle=border;c.stroke();
  };
  const rule=y=>{c.strokeStyle='#ffffff30';c.beginPath();c.moveTo(52,y);c.lineTo(1148,y);c.stroke();};
  write('ASG RACING',52,82,34,'#fff',900);
  write(side==='front'?'RACING PASS':text('РЕЗУЛЬТАТЫ','RESULTS'),900,79,21,'#c5d0df',700,240);
  rule(107);
  const number='#'+(profile.race_number??'—');
  if(side==='front'){
    const img=await avatarImage(profile.avatar);
    if(img){c.save();c.beginPath();c.roundRect(55,160,196,196,15);c.clip();c.drawImage(img,55,160,196,196);c.restore();}
    else{plate(55,160,196,196,accent);write(initials(profile),98,282,57,accent,750);}
    write(profile.driver,285,240,52,'#fff',800,640);
    write(profile.teamName,285,292,25,'#bac8dc',500,640);
    write(number,940,241,66,'#e5ebf4',850,204);
    ratings(profile).forEach(([title,value,label,css],i)=>{
      const x=55+i*557;
      const ratingEl=preview?.querySelector('.'+css);
      const color=ratingEl?getComputedStyle(ratingEl).getPropertyValue('--rating-color').trim()||'#c5d0df':'#c5d0df';
      plate(x,406,534,172,color);
      write(title,x+28,451,24,'#bdc9d9',650);
      write(value,x+27,539,65,color,800,340);
      write(label,x+424,538,32,color,750,78);
    });
    write(settings.pass_motto,55,632,25,'#e5ebf4',600,1050);
  }else{
    write(profile.driver,55,177,34,'#fff',800,860);
    write(number,960,177,34,'#e5ebf4',800,180);
    totals(profile,text).forEach(([name,value],i)=>{
      const x=55+i%2*557,y=215+Math.floor(i/2)*155;
      plate(x,y,534,133,'#ffffff28');write(name,x+22,y+43,24,'#bccbdd');write(value,x+22,y+106,57,'#fff',800);
    });
    write(text('Публичный профиль','Public profile'),55,566,23,'#d9e7f6');
    write(profileUrl(profile),55,613,23,'#bccbdd');
  }
  rule(670);
  write('ASG / SIM RACING COMMUNITY',55,708,18,'#a9bbce',500);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!blob)throw new Error('pass_export');
  download(blob,`ASG-${profile.public_id}-pass-${side}.png`);
}
