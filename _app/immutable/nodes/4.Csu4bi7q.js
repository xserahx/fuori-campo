import{A as e,C as t,E as n,G as r,J as i,K as a,N as o,S as s,T as c,W as l,Y as u,Z as d,a as f,b as p,c as m,d as h,f as g,h as _,i as ee,j as te,k as v,nt as y,ot as b,rt as ne,s as x,u as S,w as C,x as w,y as re,z as T}from"../chunks/Bgd8qZa1.js";import{n as E,r as D}from"../chunks/BjlyuwUo.js";import"../chunks/v_jBEYI6.js";import"../chunks/CZmDCu5x.js";/* empty css                */import{t as ie}from"../chunks/DnUBmEZM.js";import{a as ae,c as oe,i as se,l as ce,n as le,o as ue,r as de,s as fe,t as O,u as pe}from"../chunks/DfKwZeAd.js";var me=n(`<div class="mobile-bg svelte-asxkl5"></div>`),he=n(`<span class="title-fill svelte-asxkl5"> </span>`),ge=n(`<span class="title-outline svelte-asxkl5"> </span>`),_e=n(`<section class="mobile-carousel svelte-asxkl5" id="main-content" aria-label="Category carousel"><!> <div class="mobile-blur mobile-blur--top svelte-asxkl5" aria-hidden="true"></div> <div class="mobile-blur mobile-blur--bottom svelte-asxkl5" aria-hidden="true"></div> <div class="mobile-title svelte-asxkl5" aria-live="polite" lang="it"></div> <a class="scopri-btn svelte-asxkl5">SCOPRI DI PIÙ</a> <div class="mobile-nav-circles svelte-asxkl5"><!> <!></div></section>`),ve=n(`<span class="title-fill svelte-asxkl5"> </span>`),ye=n(`<span class="title-outline svelte-asxkl5"> </span>`),be=n(`<section class="carousel svelte-asxkl5" id="main-content" aria-label="Category carousel"><canvas class="svelte-asxkl5"></canvas> <div class="edge-panel edge-panel--left svelte-asxkl5" aria-hidden="true"><div class="edge-panel__layer svelte-asxkl5"></div> <div class="edge-panel__layer svelte-asxkl5"></div></div> <div class="edge-panel edge-panel--right svelte-asxkl5" aria-hidden="true"><div class="edge-panel__layer svelte-asxkl5"></div> <div class="edge-panel__layer svelte-asxkl5"></div></div> <div class="arrow-left svelte-asxkl5"><!></div> <div class="arrow-right svelte-asxkl5"><!></div> <div class="curve-frame svelte-asxkl5" aria-hidden="true"><svg class="curve curve-top svelte-asxkl5" viewBox="0 0 1000 260" preserveAspectRatio="none"><path d="M0,0 H1000 V115 C780,175 220,175 0,115 Z"></path></svg> <svg class="curve curve-bottom svelte-asxkl5" viewBox="0 0 1000 260" preserveAspectRatio="none"><path d="M0,145 C220,85 780,85 1000,145 V260 H0 Z"></path></svg></div> <div class="bottom-bar svelte-asxkl5"><div aria-live="polite" role="button" tabindex="0"></div></div></section>`);function k(n,v){ne(v,!0);let k=x(v,`categories`,3,[{id:1,label:`RELAZIONI E COMUNICAZIONE`,image:`/volunteer_images/carosello_categorie/Relazioni_e_comunicazione.png`},{id:2,label:`CERIMONIE E REVENUE`,image:`/volunteer_images/carosello_categorie/Cerimonia_e_revenue.png`},{id:3,label:`SPORT E DISCIPLINE`,image:`/volunteer_images/carosello_categorie/Sport.png`},{id:4,label:`AREA ORGANIZZATIVA E SERVIZI GENERALI`,image:`/volunteer_images/carosello_categorie/Area_organizzativa.png`,mobileFillLh:40},{id:5,label:`LOGISTICA E TERRITORIO`,image:`/volunteer_images/carosello_categorie/Logistica_e_territorio.png`,mobileFillLh:40,mobileOutlineLh:40},{id:6,label:`GESTIONE OPERATIVA E FAN EXPERIENCE`,image:`/volunteer_images/carosello_categorie/Gestione_operativa_e_fan_experience.png`}]),A=u(null),j=u(null),M=null,N=null,P=null,F=null,xe=0,Se=[],I=[],L=0,R=0,z=u(0),B=u(0),V=u(!1),Ce=0,H=!1,U=0,W=0,G=4.1,K=()=>k().length;function q(e,t){return(e%t+t)%t}function we(e,t,n){return e+(t-e)*n}function J(e){return e=Math.max(0,Math.min(1,e)),e*e*(3-2*e)}function Te(e){return e.toLowerCase().replace(/[^\w\s-]/g,``).trim().replace(/\s+/g,`-`)}function Y(e){switch(Te(e)){case`relazioni-e-comunicazione`:return`relazioni`;case`cerimonie-e-revenue`:return`cerimonie`;case`sport-e-discipline`:return`sport`;case`area-organizzativa-e-servizi-generali`:return`organizzativa`;case`logistica-e-territorio`:return`logistica`;case`gestione-operativa-e-fan-experience`:return`gestione`;default:return Te(e)}}function Ee(){if(!o(A)||!o(j))return;N=new oe,F=new de;let e=o(j).clientWidth,t=o(j).clientHeight;P=new ae(52,e/t,.1,100),P.position.set(0,0,G*.98),M=new le({canvas:o(A),antialias:!0,alpha:!0}),M.setPixelRatio(Math.min(window.devicePixelRatio,2)),M.setSize(e,t),M.setClearColor(0,0);let n=new pe;I=k().map(e=>{let t=n.load(e.image,void 0,void 0,void 0);return t.colorSpace=fe,t});for(let e=0;e<11;e++){let t=q(e-5,K()),n=new ce({uniforms:{uTex:{value:I[t]},uTime:{value:0},uFade:{value:0},uBlend:{value:0}},vertexShader:`
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }`,fragmentShader:`
    uniform sampler2D uTex;
    uniform float     uTime;
    uniform float     uFade;   // 0..1 alpha driven by distance
    uniform float     uBlend;  // 0=sharp  1=fully side-like (used during transition)
    varying vec2 vUv;

    float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float grain(vec2 uv, float t){
      return (hash(uv + fract(t*0.017)) - 0.5) * 0.038;
    }

    void main(){
      vec4 c = texture2D(uTex, vUv);
      c.rgb  += grain(vUv, uTime);

      // Feather all four edges so the centre card has no hard rectangular
      // border — it dissolves softly into the blurred layer behind it,
      // killing the boxy seam / double-exposure look during drag.
      float edge = smoothstep(0.0, 0.16, vUv.x) * smoothstep(0.0, 0.16, 1.0 - vUv.x)
                 * smoothstep(0.0, 0.16, vUv.y) * smoothstep(0.0, 0.16, 1.0 - vUv.y);

      gl_FragColor = vec4(c.rgb, uFade * edge);
    }`,transparent:!0,depthWrite:!1}),r=new ce({uniforms:{uTex:{value:I[t]},uTime:{value:0},uSide:{value:1},uFade:{value:0},uDist:{value:0}},vertexShader:`
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }`,fragmentShader:`
    uniform sampler2D uTex;
    uniform float     uTime;
    uniform float     uSide;   // -1=left  +1=right
    uniform float     uFade;
    uniform float     uDist;   // abs distance from center (0=neighbour, 1=far)
    varying vec2 vUv;

    // Zoom-blur from inner edge — streaks outward.
    vec4 zoomBlur(sampler2D t, vec2 uv, float side, float str){
      vec2 focus = vec2(side > 0.0 ? 0.0 : 1.0, 0.5);
      vec4 acc = vec4(0.0);
      const int S = 30;
      for(int i=0;i<S;i++){
        float f   = float(i)/float(S-1);
        float w   = f * f;
        vec2  off = (uv - focus) * f * str * 0.36;
        acc += texture2D(t, clamp(uv - off, 0.001, 0.999)) * w;
      }
      return acc / (float(S) * 0.33);
    }

    vec2 barrel(vec2 uv, float k, float side){
      vec2 c = uv - 0.5;
      float outer = side > 0.0 ? vUv.x : 1.0 - vUv.x;
      float kk    = k * (0.5 + outer * 1.2);
      float r2    = c.x*c.x*1.2 + c.y*c.y;
      c *= 1.0 + kk * r2 * 2.8;
      c.x += c.x * k * (-0.18 * side);
      return c + 0.5;
    }

    float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float grain(vec2 uv, float t){
      return (hash(uv + fract(t*0.013)) - 0.5) * 0.18;
    }

    void main(){
      float k   = 0.34 + uDist * 0.56;
      float blr = 1.55 + uDist * 2.05;

      vec2  wuv = barrel(vUv, k, uSide);
      wuv = clamp(wuv, 0.001, 0.999);

      vec4 col  = zoomBlur(uTex, wuv, uSide, blr);
      col.rgb  += grain(vUv, uTime);

      col.rgb *= vec3(0.84, 0.93, 1.05);
      float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
      col.rgb = mix(vec3(lum), col.rgb, 0.88);

      float innerX = uSide > 0.0 ? (1.0 - vUv.x) : vUv.x;
      float topB   = smoothstep(0.0, 0.22, vUv.y) * smoothstep(0.0, 0.22, 1.0 - vUv.y);
      float sideV  = smoothstep(0.0, 0.58, innerX) * (1.0 - smoothstep(0.55, 1.0, innerX)*0.3);
      float vig    = topB * sideV;
      col.rgb     *= vig * 0.72 + 0.015;

      col.rgb *= 0.64 - uDist * 0.12;

      gl_FragColor = vec4(col.rgb, uFade);
    }`,transparent:!0,depthWrite:!1}),i=new se(new ue(3.2,3.2,1,1),n),a=new se(new ue(3.7,3.7,1,1),r);N.add(i),N.add(a),Se.push({cMesh:i,sMesh:a,cMat:n,sMat:r,texIdx:t})}De()}function De(){if(!M||!N||!P||!F)return;xe=requestAnimationFrame(De);let e=F.getElapsedTime();R=we(R,L,.025);let t=R+W;i(z,t),Se.forEach((n,r)=>{let i=r-5,a=q(Math.round(t)+i,K());n.texIdx!==a&&(n.texIdx=a,n.cMat.uniforms.uTex.value=I[a],n.sMat.uniforms.uTex.value=I[a]);let o=i-(t-Math.round(t)),s=Math.abs(o),c=o>=0?1:-1,l=o*.25,u=G*Math.sin(l),d=G*Math.cos(l)-G,f=-l*1.2,p=Math.exp(-s*s*2.9),m=J(Math.max(0,s-.02)*2.1)*(1-J(Math.max(0,s-2.15)*1.5)),h=Math.min(1,Math.max(0,(s-.18)/1.2));n.cMesh.position.set(u,0,d+.03),n.cMesh.rotation.set(0,f,0),n.cMesh.visible=p>.003,n.cMat.uniforms.uFade.value=p,n.cMat.uniforms.uTime.value=e,n.sMesh.position.set(u,0,d-.03),n.sMesh.rotation.set(0,f,0),n.sMesh.visible=!0,n.sMat.uniforms.uFade.value=Math.max(m,.12),n.sMat.uniforms.uTime.value=e,n.sMat.uniforms.uSide.value=c,n.sMat.uniforms.uDist.value=h}),M.render(N,P)}function X(e){L+=e,i(B,q(L,K()),!0)}function Oe(e,t){t.stopPropagation(),X(e)}function ke(e){H=!0,U=e.clientX,W=0,e.currentTarget?.setPointerCapture(e.pointerId)}function Ae(e){!H||!o(j)||(W=(U-e.clientX)/(o(j).clientWidth*.38))}function je(){if(H){if(H=!1,Math.abs(W)<.08&&o(j)&&Math.abs(U-o(j).clientWidth/2)/o(j).clientWidth<.22){W=0,Fe();return}W>.35?L++:W<-.35&&L--,i(B,q(L,K()),!0),W=0}}function Me(){if(!M||!o(j)||!P)return;let e=o(j).clientWidth,t=o(j).clientHeight;P.aspect=e/t,P.updateProjectionMatrix(),M.setSize(e,t)}function Ne(e){Ce=e.touches[0].clientY}function Pe(e){let t=Ce-e.changedTouches[0].clientY;Math.abs(t)>40&&X(t>0?1:-1)}async function Fe(){let e=q(Math.round(R||0),K()),t=Y((k()?.[e]?.label??``)||``);t&&await D(`/category/${t}`)}E(()=>{document.body.style.overflow=``,document.body.style.paddingTop=``}),f(()=>{let e=()=>{i(V,window.innerWidth<600)};e(),window.addEventListener(`resize`,e);let t={pt:document.body.style.paddingTop,ov:document.body.style.overflow};return document.body.style.paddingTop=`0`,document.body.style.overflow=`hidden`,o(V)||(Ee(),window.addEventListener(`resize`,Me)),()=>{document.body.style.paddingTop=t.pt,document.body.style.overflow=t.ov,window.removeEventListener(`resize`,e)}}),ee(()=>{typeof cancelAnimationFrame<`u`&&cancelAnimationFrame(xe);try{M?.dispose()}catch{}typeof window<`u`&&window.removeEventListener(`resize`,Me)});let Z=d(()=>q(Math.round(o(B)),K())),Ie=d(()=>q(Math.round(o(z)),K())),Le=d(()=>{if(H)return W>.001?1:W<-.001?-1:0;let e=L-o(z);return e>.001?1:e<-.001?-1:0}),Q=d(()=>o(Le)===0?0:J(H?Math.min(1,Math.abs(W)/.35):Math.min(1,Math.abs(L-o(z))))),Re=d(()=>q(o(Ie)+o(Le),K())),ze=d(()=>k()[q(o(Ie)-1,K())]?.image??``),Be=d(()=>k()[q(o(Re)-1,K())]?.image??o(ze)),Ve=d(()=>k()[q(o(Ie)+1,K())]?.image??``),He=d(()=>k()[q(o(Re)+1,K())]?.image??o(Ve)),$=d(()=>k()[q(Math.round(o(B)),K())]?.label??``);d(()=>k()[q(o(Z)-1,K())]);let Ue=d(()=>k()[q(o(Z)+1,K())]);d(()=>o(Ue)?.label??``);let We=d(()=>(()=>{let e=o($).match(/^(.*?)(?:\s+E\s+)(.+)$/);if(e)return[e[1].trim(),`E ${e[2].trim()}`].filter(Boolean);let t=o($).split(/\s+/).filter(Boolean);if(t.length<=2)return[o($)];let n=Math.max(1,Math.ceil(t.length/2));return[t.slice(0,n).join(` `),t.slice(n).join(` `)].filter(Boolean)})()),Ge={COMUNICAZIONE:`COMUNICA-
ZIONE`},Ke={DISCIPLINE:`DISCI­PLINE`,TERRITORIO:`TERRI­TORIO`};function qe(e){return e.replace(/[\p{L}]+/gu,e=>Ke[e.toUpperCase()]??e)}function Je(e){return e.replace(/[\p{L}]+/gu,e=>{let t=e.toUpperCase();return Ge[t]??Ke[t]??e})}let Ye=d(()=>{let e=o($).match(/^(.*?)(?:\s+E\s+)(.+)$/);if(!e)return o(We).map(qe).filter(Boolean);let t=e[1].trim(),n=e[2].trim();return!n.includes(` `)&&n.length>12?[qe(`${t} E`),Je(n)]:[qe(t),Je(`E ${n}`)]}),Xe=d(()=>k()[q(Math.round(o(B)),K())]),Ze=d(()=>o(Xe)?.mobileFillLh??36),Qe=d(()=>o(Xe)?.mobileOutlineLh??36);var $e=c(),et=r($e),tt=n=>{var i=_e(),u=l(i);w(u,()=>o(Z),e=>{var t=me();T(()=>h(t,`background-image: url('${k()[o(Z)]?.image??``}')`)),_(1,t,()=>ie,()=>({duration:500,delay:80})),_(2,t,()=>ie,()=>({duration:400})),C(e,t)});var d=a(u,6);re(d,21,()=>o(Ye),p,(e,n,i)=>{var a=c(),u=r(a),d=e=>{var r=he(),i=l(r,!0);b(r),T(()=>{h(r,`line-height: ${o(Ze)??``}px`),t(i,o(n))}),C(e,r)},f=e=>{var r=ge(),i=l(r,!0);b(r),T(()=>{h(r,`line-height: ${o(Qe)??``}px`),t(i,o(n))}),C(e,r)};s(u,e=>{i===0?e(d):e(f,-1)}),C(e,a)}),b(d);var f=a(d,2),m=a(f,2),g=l(m);O(g,{direction:`up`,onclick:()=>X(-1)}),O(a(g,2),{direction:`down`,onclick:()=>X(1)}),b(m),b(i),T(e=>S(f,`href`,`/category/${e??``}`),[()=>Y(o($))]),e(`touchstart`,i,Ne,void 0,!0),e(`touchend`,i,Pe),C(n,i)},nt=n=>{var u=be(),d=l(u);m(d,e=>i(A,e),()=>o(A));var f=a(d,2),_=l(f),ee=a(_,2);b(f);var v=a(f,2),y=l(v),ne=a(y,2);b(v);var x=a(v,2);O(l(x),{direction:`left`,onclick:e=>Oe(-1,e)}),b(x);var S=a(x,2);O(l(S),{direction:`right`,onclick:e=>Oe(1,e)}),b(S);var w=a(S,4),E=l(w);let D;re(E,21,()=>o(We),p,(e,n,i)=>{var a=c(),u=r(a),d=e=>{var r=ve(),i=l(r,!0);b(r),T(()=>t(i,o(n))),C(e,r)},f=e=>{var r=ye(),i=l(r,!0);b(r),T(()=>t(i,o(n))),C(e,r)};s(u,e=>{i===0?e(d):e(f,-1)}),C(e,a)}),b(E),b(w),b(u),m(u,e=>i(j,e),()=>o(j)),T(e=>{h(_,`background-image: url('${o(ze)}'); opacity:${1-o(Q)};`),h(ee,`background-image: url('${o(Be)}'); opacity:${o(Q)};`),h(y,`background-image: url('${o(Ve)}'); opacity:${1-o(Q)};`),h(ne,`background-image: url('${o(He)}'); opacity:${o(Q)};`),D=g(E,1,`title svelte-asxkl5`,null,D,e)},[()=>({"category-sport":Y(o($))===`sport`})]),e(`pointerdown`,u,ke),e(`pointermove`,u,Ae),e(`pointerup`,u,je),te(`pointerleave`,u,je),e(`pointerdown`,x,e=>e.stopPropagation()),e(`pointerdown`,S,e=>e.stopPropagation()),e(`click`,E,Fe),e(`keydown`,E,e=>{e.key===`Enter`&&Fe()}),C(n,u)};s(et,e=>{o(V)?e(tt):e(nt,-1)}),C(n,$e),y()}v([`touchstart`,`touchend`,`pointerdown`,`pointermove`,`pointerup`,`click`,`keydown`]);export{k as component};