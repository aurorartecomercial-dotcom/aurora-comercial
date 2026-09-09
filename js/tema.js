
(() => {
  const KEY='vora313_tema';
  const themes=[
    {id:'gold',name:'Dourado',color:'#D4AF37'},
    {id:'blue',name:'Azul',color:'#2563EB'},
    {id:'green',name:'Verde',color:'#10B981'},
    {id:'purple',name:'Roxo',color:'#8B5CF6'},
    {id:'dark',name:'Escuro',color:'#111111'}
  ];
  const saved=localStorage.getItem(KEY)||'gold';
  document.body.dataset.voraTheme=themes.some(t=>t.id===saved)?saved:'gold';

  function build(){
    if(document.getElementById('vora-theme-trigger')) return;
    const headerIcons=document.querySelector('.header-icones');
    const trigger=document.createElement('button');
    trigger.id='vora-theme-trigger'; trigger.type='button'; trigger.title='Personalizar cores'; trigger.setAttribute('aria-label','Personalizar cores'); trigger.textContent='🎨';
    if(headerIcons) headerIcons.insertBefore(trigger, headerIcons.firstChild); else document.body.appendChild(trigger);

    const panel=document.createElement('aside');
    panel.id='vora-theme-panel'; panel.setAttribute('aria-label','Temas de cores VORA 313');
    panel.innerHTML=`<h3>Personalizar aparência</h3><p>Escolha uma cor para a VORA 313. A preferência fica guardada neste dispositivo.</p><div class="vora-theme-grid"></div><button class="vora-theme-close" type="button">Fechar</button>`;
    const grid=panel.querySelector('.vora-theme-grid');
    themes.forEach(t=>{
      const b=document.createElement('button'); b.type='button'; b.className='vora-theme-option'; b.dataset.theme=t.id;
      b.innerHTML=`<span class="vora-theme-swatch" style="background:${t.color}"></span><span class="vora-theme-name">${t.name}</span>`;
      b.addEventListener('click',()=>apply(t.id)); grid.appendChild(b);
    });
    panel.querySelector('.vora-theme-close').addEventListener('click',()=>panel.classList.remove('aberto'));
    document.body.appendChild(panel);
    trigger.addEventListener('click',()=>panel.classList.toggle('aberto'));
    document.addEventListener('click',e=>{ if(!panel.contains(e.target)&&e.target!==trigger) panel.classList.remove('aberto'); });
    mark();
  }
  function apply(id){ document.body.dataset.voraTheme=id; localStorage.setItem(KEY,id); mark(); }
  function mark(){ document.querySelectorAll('.vora-theme-option').forEach(b=>b.classList.toggle('ativo',b.dataset.theme===document.body.dataset.voraTheme)); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build); else build();
})();
