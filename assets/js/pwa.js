(()=>{'use strict';
const search=document.getElementById('gameSearch');
const grid=document.getElementById('gameGrid');
const count=document.getElementById('gameCount');
const empty=document.getElementById('noGamesFound');
const cards=grid?Array.from(grid.children):[];
function filterGames(){
 if(!search||!grid)return;
 const term=search.value.trim().toLocaleLowerCase('fa');
 let visible=0;
 cards.forEach(card=>{
  const match=card.textContent.toLocaleLowerCase('fa').includes(term);
  card.hidden=!match;if(match)visible++;
 });
 if(count)count.textContent=new Intl.NumberFormat('fa-IR').format(visible)+' بازی';
 if(empty)empty.hidden=visible!==0;
}
if(search){
 search.addEventListener('input',filterGames);
 document.addEventListener('keydown',event=>{
  if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&
     !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){
    event.preventDefault();search.focus();
  }
  if(event.key==='Escape'&&document.activeElement===search){search.value='';filterGames();search.blur();}
 });
}
const connection=document.getElementById('connectionStatus');
function updateConnection(){
 if(!connection)return;
 const online=navigator.onLine;
 connection.textContent=online?'آنلاین':'آفلاین';
 connection.classList.toggle('online',online);
 connection.classList.toggle('offline',!online);
}
window.addEventListener('online',updateConnection);
window.addEventListener('offline',updateConnection);
updateConnection();
let installPrompt=null;
const installButton=document.getElementById('installAppBtn');
window.addEventListener('beforeinstallprompt',event=>{
 event.preventDefault();installPrompt=event;
 if(installButton)installButton.hidden=false;
});
if(installButton)installButton.addEventListener('click',async()=>{
 if(!installPrompt)return;
 installButton.disabled=true;
 try{await installPrompt.prompt();await installPrompt.userChoice;}
 finally{installPrompt=null;installButton.hidden=true;installButton.disabled=false;}
});
window.addEventListener('appinstalled',()=>{
 if(installButton)installButton.hidden=true;
});
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
 window.addEventListener('load',()=>{
  navigator.serviceWorker.register('./service-worker.js',{scope:'./'})
   .catch(error=>console.warn('Offline support could not be enabled:',error));
 });
}
})();