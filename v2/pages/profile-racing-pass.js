const materials = {
  carbon:['#101820','#283746','#ff4d60'],
  holographic:['#191f42','#3a2359','#9ae8fb'],
  classic:['#201a15','#4b3820','#f3c775'],
};

function passData(profile,side,text) {
  const stat=key=>profile[key] ?? profile.summary?.[key] ?? '—';
  if(side==='back')return [
    [text('Гонки','Races'),stat('races')],
    [text('Победы','Wins'),stat('wins')],
    [text('Подиумы','Podiums'),stat('podiums')],
    [text('Очки','Points'),stat('points')],
  ];
  return [
    [text('Номер','Number'),'#'+(profile.race_number??'—')],
    ['ELO',stat('elo')],
    ['SR',stat('safety_rating')],
  ];
}

export function passMarkup({profile,style,side,owner,text,escape}) {
  const styles={hidden:text('Скрыть из профиля','Hide from profile'),carbon:text('Карбон','Carbon'),
    holographic:text('Голографический','Holographic'),classic:text('Гоночная классика','Racing classic')};
  const fields=passData(profile,side,text).map(([label,value])=>`<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`).join('');
  return `<div class="profile-pass-toolbar">
    <button class="button" type="button" data-pass-side="front" aria-pressed="${side==='front'}">${text('Лицевая сторона','Front')}</button>
    <button class="button" type="button" data-pass-side="back" aria-pressed="${side==='back'}">${text('Обратная сторона','Back')}</button>
    </div><article class="profile-pass" data-material="${style==='hidden'?'carbon':style}"><span class="eyebrow">ASG RACING / RACING PASS</span>
    <h3>${escape(profile.driver)}</h3><dl>${fields}</dl></article>
    ${owner?`<div class="profile-pass-toolbar"><label for="pass-style">${text('Материал и видимость','Material and visibility')}</label>
    <select id="pass-style">${Object.entries(styles).map(([id,label])=>`<option value="${id}"${id===style?' selected':''}>${label}</option>`).join('')}</select>
    <button class="button primary" type="button" data-save-pass>${text('Сохранить','Save')}</button>
    <button class="button" type="button" data-export-pass>${text('Скачать PNG','Download PNG')}</button></div>`:''}`;
}

export async function exportPass({profile,style,side,text,download}) {
  const [start,end,accent]=materials[style] || materials.carbon;
  const canvas=document.createElement('canvas');
  canvas.width=1200;canvas.height=756;
  const ctx=canvas.getContext('2d');
  const gradient=ctx.createLinearGradient(0,0,1200,756);
  gradient.addColorStop(0,start);gradient.addColorStop(1,end);
  ctx.fillStyle=gradient;ctx.fillRect(0,0,1200,756);
  ctx.fillStyle=accent;ctx.fillRect(65,72,86,6);
  ctx.font='700 25px sans-serif';ctx.fillText('ASG RACING / RACING PASS',65,132);
  ctx.fillStyle='#fff';ctx.font='700 69px sans-serif';ctx.fillText(profile.driver,65,245,1070);
  for(const [[label,value],index] of passData(profile,side,text).map((field,index)=>[field,index])){
    const x=65+index*270;
    ctx.fillStyle=accent;ctx.font='600 22px sans-serif';ctx.fillText(label,x,410);
    ctx.fillStyle='#fff';ctx.font='700 54px sans-serif';ctx.fillText(String(value),x,490,238);
  }
  ctx.fillStyle='#c5cfdd';ctx.font='22px sans-serif';
  ctx.fillText('asgracing.ru/driver/?id='+profile.public_id,65,680,1070);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!blob)throw new Error('pass_export');
  download(blob,`ASG-Racing-Pass-${profile.public_id}-${side}.png`);
}
