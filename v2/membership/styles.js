export function useStyles(name) {
  const link=document.createElement('link');
  link.rel='stylesheet';link.href='/v2/membership/'+name+'?v=20261126home1';
  document.head.append(link);
  return ()=>link.remove();
}
