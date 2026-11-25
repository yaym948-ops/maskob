/* Maskob — Start-up.
   Loaded by index.html as a classic script: files share one global scope and run in the order listed there. */
render();
Store.init();
setInterval(()=>{const a=document.activeElement;if(!a||!/^(INPUT|TEXTAREA)$/.test(a.tagName))render()},5*60*1000);
// cache fonts, libraries and images on the device for fast repeat visits
if('serviceWorker' in navigator&&location.protocol==='https:'){addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}
