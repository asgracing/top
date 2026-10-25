import test from 'node:test';
import assert from 'node:assert/strict';
import {addServerNavigation} from '../../scripts/server-navigation.mjs';
import {routeHref} from '../../v2/site-routing.js';

test('classic racing menu gets one localized link without changing other actions',()=>{
  const source='<nav><div id="top-nav-racing-group"><div class="top-nav-group-menu" hidden><a href="/races/">Races</a></div></div></nav>';
  const html=addServerNavigation(source,'ru','/servers/');
  assert.match(html,/<div class="top-nav-group-menu" hidden><a href="\/races\/">Races<\/a><a[^>]*href="\/servers\/">Серверы<\/a><\/div>/);
  assert.equal(addServerNavigation(html,'ru','/servers/'),html);
  assert.equal(addServerNavigation('<main>No menu</main>','en','/en/servers/'),'<main>No menu</main>');
});

test('server directory routes work in both languages from current and preserved pages',()=>{
  assert.equal(routeHref('servers/','ru',{layout:'root',version:'v2'}),'/servers/');
  assert.equal(routeHref('servers/','en',{layout:'root',version:'old'}),'/en/servers/');
  assert.equal(routeHref('servers/','en',{layout:'parallel',version:'v2'}),'/v2/en/servers/');
});
