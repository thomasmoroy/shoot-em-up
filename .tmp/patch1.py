p='/workspace/shootemup.html'
s=open(p,encoding='utf8').read()

def rep(old,new,count=1):
    global s
    assert s.count(old)==count,(s.count(old),repr(old[:70]))
    s=s.replace(old,new)

# 1. canvas fallback + fond opaque (le jeu peint déjà un fond plein à chaque frame)
rep("const c=document.getElementById('c'), x=c.getContext('2d');",
"""const c=document.getElementById('c'), x=c.getContext('2d',{alpha:false});
if(!x){ // navigateur sans canvas 2D : message lisible plutôt qu'une page noire
  document.body.innerHTML='<div style="display:grid;place-items:center;height:100%;font:16px system-ui;color:#e6e9ff;text-align:center;padding:24px">Ce navigateur ne prend pas en charge le canvas HTML5.<br>Essaie une version récente de Chrome, Firefox, Safari ou Edge.</div>';
  throw new Error('canvas 2d indisponible');
}""")

# 2. réveil audio au retour d'onglet
rep("addEventListener('load',resize);",
"""addEventListener('load',resize);
// Les navigateurs suspendent l'AudioContext des pages en arrière-plan : on le réveille dès le retour.
document.addEventListener('visibilitychange',()=>{if(!document.hidden)Audio_.wake();});""")

# 3. bip radio à l'arrivée d'une transmission
rep("""function transmission(who,msg,duration=4.2){
  commsWho=who;commsMsg=msg;commsMax=commsT=duration;
}""",
"""function transmission(who,msg,duration=4.2){
  commsWho=who;commsMsg=msg;commsMax=commsT=duration;
  Audio_.radio();                                   // petit « bip » de liaison
}""")

# 4. pointeur : sortie du canvas = relâche du tir, plus de vaisseau figé
rep("""c.addEventListener('pointerleave',e=>{
  if(e.pointerType!=='touch'){mouse=null;mouseFire=false;}
});""",
"""// Sortie du canvas : le tir se relâche, mais le cap est conservé (le vaisseau
// reste de toute façon clampé dans l'arène) — plus de blocage silencieux.
c.addEventListener('pointerleave',e=>{
  if(e.pointerType!=='touch')mouseFire=false;
});""")

rep("$('startBtn').onclick=()=>{Audio_.init();clearCheckpoint();start();};",
"""// Fenêtre qui perd le focus : on relâche les entrées et on met en pause,
// pour ne jamais laisser le combat tourner sans le joueur.
addEventListener('blur',()=>{mouseFire=false;touchFire=false;if(state==='play')pause();});
$('startBtn').onclick=()=>{Audio_.init();clearCheckpoint();start();};""")

# 5. Surcharge Aube : flash d'alerte visible pendant la courte invincibilité
rep("  focus=0;focusT=4.6;ebul.length=0;P.inv=Math.max(P.inv,.32);",
"  focus=0;focusT=4.6;ebul.length=0;P.inv=Math.max(P.inv,.32);P.focusFx=.55;   // alerte visuelle à l'activation")

# 6. écran de fin contextualisé + nouveau record mis en avant
rep("""function gameOver(){
  state='over';
  if(score>best){best=score;Store.set('cosmochat_best',best);}
  const z=chapterAt(waveIdx);""",
"""function gameOver(){
  state='over';
  const recordRun=score>best&&best>0;
  if(score>best){best=score;Store.set('cosmochat_best',best);}
  const z=chapterAt(waveIdx);
  $('overTitle').textContent=z.index>=CAMPAIGN.length-1?'DERNIER REMPART · COQUE PERDUE':'CHASSEUR DÉTRUIT';""")

rep("Vague ${waveIdx+1}<br>",
"""Vague ${waveIdx+1}${recordRun?' · <b style="color:#8ef6a0">NOUVEAU RECORD</b>':''}<br>""")

open(p,'w',encoding='utf8').write(s)
print('patch ok')
