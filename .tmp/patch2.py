p='/workspace/shootemup.html'
s=open(p,encoding='utf8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)==count,(s.count(old),repr(old[:70]))
    s=s.replace(old,new)

# ---- A. drawAimReticle : le réticule suit la souris même hors du canvas (elle n'est plus remise à null) ----
rep("""function drawAimReticle(){
  if(!mouse||state!=='play')return;
  const px=clamp(mouse.x,12,VW-12),py=clamp(mouse.y,12,VH-12);""",
"""function drawAimReticle(){
  if(!mouse||state!=='play'||touch)return;   // le doigt pilote déjà le vaisseau : pas de réticule
  const px=clamp(mouse.x,12,VW-12),py=clamp(mouse.y,12,VH-12);""")

# ---- B. flash d'alerte de la Surcharge (P.focusFx) : anneau doré pulsé, indépendant des options graphiques ----
rep("""  if(focusT>0){
    const fk=focusT/4.6,rr=34+Math.sin(gameT*16)*5;""",
"""  // Alerte d'activation : quelques dixièmes de seconde, lisible même en mode réduit.
  if(P&&P.focusFx>0){
    const k=clamp(P.focusFx/.55,0,1);
    x.save();x.globalAlpha=k*(reduceFx?.5:.85);x.strokeStyle='#fff0a8';
    x.lineWidth=3*k;x.beginPath();x.arc(px,py,26+(1-k)*46,0,7);x.stroke();
    x.lineWidth=1.4;x.globalAlpha=k*.6;
    x.beginPath();x.arc(px,py,34+(1-k)*62,0,7);x.stroke();x.restore();x.globalAlpha=1;
  }
  if(focusT>0){
    const fk=focusT/4.6,rr=34+Math.sin(gameT*16)*5;""")
rep("""  if(P.upFx>0)P.upFx-=dt;""",
"""  if(P.upFx>0)P.upFx-=dt;
  if(P.focusFx>0)P.focusFx-=dt;""")

# ---- C. rendu : fond opaque explicite (canvas alpha:false) + étoiles plafonnées en mode fluide ----
rep("""function render(){
  x.save();
  if(shake>0){const sh=shake; x.translate(rnd(-sh,sh)*.5,rnd(-sh,sh)*.5);}""",
"""function render(){
  x.save();
  if(shake>0){const sh=shake; x.translate(rnd(-sh,sh)*.5,rnd(-sh,sh)*.5);}
  // Le contexte est opaque : on peint un fond plein avant tout décalage de secousse.
  x.fillStyle='#03040c';x.fillRect(-40,-40,VW+80,VH+80);""")

# ---- D. boucle : décimation du rendu quand autoLite s'installe (le gameplay reste à la cadence max) ----
rep("""  let dt=Math.min(rawDt,1/30);               // garde-fou : jamais plus de 33 ms d'un coup""",
"""  // En difficulté persistante de framerate, on ne dessine que 30 images/s maximum :
  // la simulation garde sa cadence, seul le rendu s'allège (mouvement toujours fluide à 30 i/s).
  const liteSkip=autoLite&&(frameCount++&1);
  let dt=Math.min(rawDt,1/30);               // garde-fou : jamais plus de 33 ms d'un coup""")
rep("""  if(state!=='menu'){ render(); hud(); }""",
"""  if(state!=='menu'&&!liteSkip){ render(); hud(); }""")
rep("""let last=performance.now();
function loop(now){""",
"""let last=performance.now(), frameCount=0;
function loop(now){""")

open(p,'w',encoding='utf8').write(s)
print('patch2 ok')
