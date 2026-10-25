// The maintained V1 sources remain available for an explicit recovery release.
import {versionHref} from './site-routing.js?v=20261025raceinfo1';
const language=document.documentElement.lang==='en'?'en':'ru';
location.replace(versionHref('v2',location,language,{layout:'root',version:'old'}));
