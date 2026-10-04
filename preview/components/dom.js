export const ru = () => document.documentElement.lang === "ru";
export const copy = (russian,english) => ru()?russian:english;
export function el(tag,className="",text="") {
  const node=document.createElement(tag);node.className=className;
  if(text!==undefined&&text!==null)node.textContent=String(text);
  return node;
}
export function observeContent(target, callback) {
  if(!target)return;
  let pending=false;
  const observer=new MutationObserver(()=>{
    if(pending)return;
    pending=true;requestAnimationFrame(()=>{pending=false;callback(target);});
  });
  observer.observe(target,{childList:true,subtree:true});
  callback(target);
  window.addEventListener("pagehide",()=>observer.disconnect(),{once:true});
}
