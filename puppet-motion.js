// Each rig follows its own growth portrait. Coordinates are normalized to that image.
export const GROWTH_RIGS=[
 [
  [[.65,.35,.33,.27],[.70,.82,.18,.18],[.18,.62,.22,.32]],
  [[.70,.46,.32,.28],[.70,.85,.19,.17],[.16,.45,.22,.30]],
  [[.70,.29,.30,.28],[.70,.80,.18,.19],[.16,.55,.23,.31]],
  [[.73,.30,.32,.29],[.72,.82,.19,.20],[.17,.59,.23,.31]],
  [[.76,.30,.29,.27],[.75,.61,.21,.20],[.14,.42,.22,.31]],
  [[.74,.27,.27,.28],[.85,.86,.18,.20],[.18,.61,.23,.32]],
 ],
 [
  [[.64,.55,.30,.23],[.70,.84,.17,.17],[.20,.81,.19,.20]],
  [[.61,.37,.29,.22],[.70,.59,.18,.18],[.24,.77,.20,.21]],
  [[.70,.44,.29,.24],[.80,.68,.18,.18],[.20,.77,.20,.21]],
  [[.70,.43,.29,.24],[.74,.86,.17,.19],[.20,.82,.20,.20]],
  [[.65,.43,.29,.24],[.70,.70,.19,.19],[.21,.78,.20,.21]],
  [[.66,.33,.28,.23],[.67,.69,.18,.20],[.21,.82,.21,.21]],
 ],
 [
  [[.65,.40,.31,.28],[.67,.84,.18,.18],[.20,.73,.26,.26]],
  [[.75,.45,.29,.27],[.76,.84,.18,.18],[.29,.36,.28,.31]],
  [[.76,.33,.28,.25],[.75,.80,.18,.20],[.24,.53,.31,.35]],
  [[.77,.34,.28,.25],[.79,.65,.19,.21],[.25,.55,.31,.34]],
  [[.77,.35,.28,.26],[.81,.61,.19,.20],[.25,.55,.32,.35]],
  [[.80,.27,.27,.26],[.86,.87,.18,.19],[.25,.57,.31,.35]],
 ]
];
const clamp=x=>Math.max(0,Math.min(1,x));
const wave=(t,a,b)=>t<a||t>b?0:Math.sin(Math.PI*(t-a)/(b-a));
export function puppetPose(pet,action,t,elapsed=0){
 t=clamp(t);const e=Math.sin(Math.PI*t)**2;
 let head=0,paw=0,tail=0,ear=0,jaw=0,hop=0,squash=1,dx=0;
 if(action==='snack'){
  head=.045*wave(t,.04,.72);paw=-.12*wave(t,.05,.45);
  jaw=.007*Math.sin(elapsed*.028)*wave(t,.30,.73);
  hop=-.055*wave(t,.74,.94);squash=1-.025*wave(t,.68,.78);
  tail=.035*Math.sin(elapsed*.006)*e;ear=pet===1?.025*Math.sin(elapsed*.007)*e:0;
 }else if(action==='toy'){
  head=.035*Math.sin(elapsed*.005)*e;tail=.07*Math.sin(elapsed*.007)*e;
  if(pet===0)paw=-.15*wave(t,.13,.69);
  if(pet===1){hop=-.045*Math.sin(Math.PI*t*2)**2*e;ear=.045*Math.sin(elapsed*.008)*e;squash=1-.02*Math.sin(Math.PI*t*2)**2*e;}
  if(pet===2){paw=-.06*e;dx=.012*Math.sin(elapsed*.004)*e;}
 }else{
  if(['look','perk','follow'].includes(action))head=-.045*e+.022*Math.sin(elapsed*.005)*e;
  if(['inspect','sniff','sip','warm'].includes(action))head=.065*e;
  if(['reach','stamp','pluck','splash','ring'].includes(action))paw=-.15*e;
  if(['sway','follow','warm'].includes(action))tail=.075*Math.sin(elapsed*.006)*e;
  if(['listen','perk','ring'].includes(action))ear=.045*Math.sin(elapsed*.007)*e;
  if(['hop','double-hop','step','splash'].includes(action)){hop=-.04*Math.sin(Math.PI*t*(action==='double-hop'?2:1))**2*e;squash=1-.02*e;}
  if(['sniff','sip'].includes(action))jaw=.003*Math.sin(elapsed*.018)*e;
 }
 return {head,paw,tail,ear,jaw,hop,squash,dx};
}
export function rigFor(pet,stage){
 const [head,paw,tail]=GROWTH_RIGS[pet][stage];
 const ear=pet===1?[head[0]-.12,Math.max(.10,head[1]-.23),.26,.29]:[head[0]-.02,head[1]-.13,.20,.15];
 return {head,paw,tail,ear,mouth:[head[0]+.07,head[1]+.10,.15,.085]};
}
export const PUPPET_VERTEX=`
attribute vec2 position;varying vec2 uv;
uniform vec4 fit;uniform float aspect;
uniform vec4 headMask;uniform vec4 pawMask;uniform vec4 tailMask;uniform vec4 earMask;uniform vec4 mouthMask;
uniform vec4 angles;uniform vec4 body;uniform float jaw;
float influence(vec2 p,vec4 mask){vec2 d=(p-mask.xy)/mask.zw;float r=dot(d,d);return 1.-smoothstep(.20,1.,r);}
vec2 rotation(vec2 p,vec2 pivot,float angle){vec2 d=(p-pivot)*vec2(aspect,1.);float c=cos(angle),s=sin(angle);return (vec2(c*d.x-s*d.y,s*d.x+c*d.y)-d)/vec2(aspect,1.);}
void main(){
 uv=position;vec2 p=position;
 vec2 delta=rotation(p,headMask.xy+vec2(-.035,.15),angles.x)*influence(p,headMask);
 delta+=rotation(p,pawMask.xy+vec2(-.04,-.12),angles.y)*influence(p,pawMask);
 delta+=rotation(p,tailMask.xy+vec2(.14,.12),angles.z)*influence(p,tailMask);
 delta+=rotation(p,earMask.xy+vec2(.03,.17),angles.w)*influence(p,earMask);
 delta.y+=jaw*influence(p,mouthMask);
 p+=delta;p.y=.96+(p.y-.96)*body.y+body.x;p.x+=body.z;
 vec2 screen=fit.xy+p*fit.zw;gl_Position=vec4(screen.x*2.-1.,1.-screen.y*2.,0.,1.);
}`;
export const PUPPET_FRAGMENT=`precision mediump float;varying vec2 uv;uniform sampler2D portrait;void main(){gl_FragColor=texture2D(portrait,uv);}`;
function compile(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Puppet shader unavailable');return s;}
function fitFor(target,image){const s=(image.motionFit??.94)*Math.min(target.width/image.naturalWidth,target.height/image.naturalHeight),w=image.naturalWidth*s/target.width,h=image.naturalHeight*s/target.height;return [(1-w)/2,1-h-(image.motionFloor??.02),w,h];}
function gpu(target,image,rig){
 const surface=document.createElement('canvas');surface.width=target.width;surface.height=target.height;
 const gl=surface.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,depth:false,stencil:false});if(!gl?.createShader)return null;
 try{
  const program=gl.createProgram(),vs=compile(gl,gl.VERTEX_SHADER,PUPPET_VERTEX),fs=compile(gl,gl.FRAGMENT_SHADER,PUPPET_FRAGMENT);
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Puppet link unavailable');gl.useProgram(program);
  const vertices=[];const grid=40;for(let y=0;y<grid;y++)for(let x=0;x<grid;x++){const a=x/grid,b=y/grid,c=(x+1)/grid,d=(y+1)/grid;vertices.push(a,b,c,b,a,d,a,d,c,b,c,d);}
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  const names=['fit','aspect','headMask','pawMask','tailMask','earMask','mouthMask','angles','body','jaw','portrait'];const u=Object.fromEntries(names.map(k=>[k,gl.getUniformLocation(program,k)]));
  gl.uniform1i(u.portrait,0);gl.uniform1f(u.aspect,image.naturalWidth/image.naturalHeight);gl.uniform4f(u.fit,...fitFor(target,image));
  for(const key of ['head','paw','tail','ear','mouth'])gl.uniform4f(u[key+'Mask'],...rig[key]);
  gl.viewport(0,0,surface.width,surface.height);gl.clearColor(0,0,0,0);gl.disable(gl.BLEND);const ctx=target.getContext('2d');let disposed=false;
  return {kind:'webgl',render(p){if(disposed)return;gl.uniform4f(u.angles,p.head,p.paw,p.tail,p.ear);gl.uniform4f(u.body,p.hop,p.squash,p.dx,0);gl.uniform1f(u.jaw,p.jaw);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,vertices.length/2);ctx.clearRect(0,0,target.width,target.height);ctx.drawImage(surface,0,0);},dispose(){if(disposed)return;disposed=true;gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);gl.getExtension('WEBGL_lose_context')?.loseContext();}};
 }catch{gl.getExtension('WEBGL_lose_context')?.loseContext();return null;}
}
function influence(x,y,m){const d=((x-m[0])/m[2])**2+((y-m[1])/m[3])**2;const t=Math.max(0,Math.min(1,(d-.2)/.8));return 1-t*t*(3-2*t);}
export function deformPoint(x,y,rig,p,aspect){
 let dx=0,dy=0;
 for(const [mask,angle,ox,oy] of [[rig.head,p.head,-.035,.15],[rig.paw,p.paw,-.04,-.12],[rig.tail,p.tail,.14,.12],[rig.ear,p.ear,.03,.17]]){
  const weight=influence(x,y,mask);if(!weight||!angle)continue;const u=(x-mask[0]-ox)*aspect,v=y-mask[1]-oy,c=Math.cos(angle),s=Math.sin(angle);
  dx+=((c*u-s*v-u)/aspect)*weight;dy+=(s*u+c*v-v)*weight;
 }
 dy+=p.jaw*influence(x,y,rig.mouth);
 return [x+dx+p.dx,.96+(y+dy-.96)*p.squash+p.hop];
}
function software(target,image,rig){
 const side=144,source=document.createElement('canvas');source.width=source.height=side;const sc=source.getContext('2d',{willReadFrequently:true});sc.drawImage(image,0,0,side,side);const pixels=sc.getImageData(0,0,side,side).data;
 const output=sc.createImageData(side,side),ctx=target.getContext('2d'),aspect=image.naturalWidth/image.naturalHeight;let disposed=false;
 return {kind:'software',render(p){
  if(disposed)return;
  for(let y=0;y<side;y++)for(let x=0;x<side;x++){
   const tx=x/(side-1),ty=y/(side-1);let sx=tx,sy=ty;
   for(let j=0;j<3;j++){const q=deformPoint(sx,sy,rig,p,aspect);sx+=tx-q[0];sy+=ty-q[1];}
   const offset=(y*side+x)*4;
   if(sx<0||sy<0||sx>1||sy>1){output.data[offset+3]=0;continue;}
   const px=sx*(side-1),py=sy*(side-1),ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy;let a=0,r=0,g=0,b=0;
   for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
    const i=(Math.min(side-1,iy+dy)*side+Math.min(side-1,ix+dx))*4,w=(dx?fx:1-fx)*(dy?fy:1-fy),alpha=pixels[i+3]/255;
    a+=alpha*w;r+=pixels[i]*alpha*w;g+=pixels[i+1]*alpha*w;b+=pixels[i+2]*alpha*w;
   }
   output.data[offset]=a?r/a:0;output.data[offset+1]=a?g/a:0;output.data[offset+2]=a?b/a:0;output.data[offset+3]=a*255;
  }
  sc.putImageData(output,0,0);const f=fitFor(target,image);ctx.clearRect(0,0,target.width,target.height);ctx.drawImage(source,f[0]*target.width,f[1]*target.height,f[2]*target.width,f[3]*target.height);
 },dispose(){disposed=true;}};
}
export function createPuppetRenderer(target,image,pet,stage){const rig=rigFor(pet,stage);return gpu(target,image,rig)??software(target,image,rig);}
