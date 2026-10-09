const frame = document.getElementById('preview');
function update() {
  frame.style.width = document.getElementById('width').value;
  frame.style.maxWidth = '100%';
  frame.src = `./frame.html?event=fixture&lang=${document.getElementById('lang').value}&scenario=${document.getElementById('scenario').value}`;
}
for (const id of ['scenario', 'lang', 'width']) document.getElementById(id).onchange = update;
document.getElementById('reset').onclick = update;
update();
