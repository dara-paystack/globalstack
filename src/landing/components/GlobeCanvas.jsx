import { useRef, useEffect, memo } from 'react'
import {
  WebGLRenderer, Scene, PerspectiveCamera, Clock,
  DirectionalLight, AmbientLight,
  Group, Mesh, Line, LineSegments, Sprite,
  BufferGeometry, BufferAttribute,
  ShapeGeometry, SphereGeometry, PlaneGeometry,
  LineBasicMaterial, MeshBasicMaterial, MeshLambertMaterial, ShaderMaterial, SpriteMaterial,
  CanvasTexture,
  Vector2, Vector3, Euler, Quaternion, Color,
  Shape, CatmullRomCurve3, Raycaster,
  SRGBColorSpace, DoubleSide, BackSide,
} from 'three'
import { S0_START, S0_END, S1_START, S1_END, S2_START, S2_END, S3_START, S3_END, S4_START, S4_END, S5_START, S5_END, BG_BLUE_START, BG_BLUE_MID, BG_DARK_START, BG_DARK_MID } from '../constants/scroll'

// Module-level Promise cache — deduplicates concurrent requests across re-mounts;
// cleared on failure so the next mount can retry cleanly.
// Kicked off immediately at module init so the fetch runs in parallel with WebGL setup.
let topoCachePromise = null
function getTopoData() {
  if (!topoCachePromise) {
    topoCachePromise = fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then((res) => {
        if (!res.ok) throw new Error(`TopoJSON fetch failed: ${res.status}`)
        return res.json()
      })
      .catch((err) => {
        topoCachePromise = null  // clear on error so the next mount can retry
        throw err
      })
  }
  return topoCachePromise
}
getTopoData()  // prefetch on module load — by the time the component mounts, data may already be ready

// ── Country ID sets ───────────────────────────────────────────────────────────
const AFRICA_IDS = new Set([
  12,24,72,108,120,132,140,148,174,175,178,180,204,226,231,
  232,262,266,270,288,324,384,404,426,430,434,450,454,466,478,
  480,504,508,516,562,566,624,638,646,654,678,686,694,706,710,
  716,728,729,732,734,748,768,788,800,818,834,854,894,
])
const EUROPE_IDS = new Set([
  8,20,40,56,70,100,191,196,203,208,233,246,250,276,300,348,
  352,372,380,428,438,440,442,470,492,499,528,578,616,620,642,
  688,703,705,724,752,756,807,826,
])

const SUPPORTED = [
  { id:566, name:'Nigeria',       cur:'NGN' },
  { id:686, name:'Senegal',       cur:'XOF' },
  { id:384, name:'Ivory Coast',   cur:'XOF' },
  { id:204, name:'Benin',         cur:'XOF' },
  { id:854, name:'Burkina Faso',  cur:'XOF' },
  { id:466, name:'Mali',          cur:'XOF' },
  { id:768, name:'Togo',          cur:'XOF' },
  { id:404, name:'Kenya',         cur:'KES' },
  { id:834, name:'Tanzania',      cur:'TZS' },
  { id:800, name:'Uganda',        cur:'UGX' },
  { id:646, name:'Rwanda',        cur:'RWF' },
  { id:710, name:'South Africa',  cur:'ZAR' },
  { id:72,  name:'Botswana',      cur:'BWP' },
  { id:454, name:'Malawi',        cur:'MWK' },
  { id:894, name:'Zambia',        cur:'ZMW' },
  { id:120, name:'Cameroon',      cur:'XAF' },
  { id:178, name:'Congo',         cur:'XAF' },
  { id:180, name:'DR Congo',      cur:'CDF' },
]
const SUPPORTED_IDS = new Set(SUPPORTED.map(s => s.id))

// Scroll state boundaries — imported from shared constants
const S0S=S0_START, S0E=S0_END
const S1S=S1_START, S1E=S1_END
const S2S=S2_START, S2E=S2_END
const S3S=S3_START, S3E=S3_END
const S4S=S4_START, S4E=S4_END
const S5S=S5_START, S5E=S5_END

const GLOBE_SCALE = 1.20

// Globe orientation targets
const ORI = [
  { x: 0,      y: -0.349 },
  { x: -0.349, y:  0     },
  { x: 0,      y: -0.349 },
  { x: -0.175, y: -0.349 },
  { x: 0,      y: -0.349 },
  { x: 0,      y: -0.349 },
]

// City data
const PARIS       = { lat:51.5074,  lon:-0.1278, name:'LONDON',  coord:'51.5074°N, 0.1278°W'  }
const ABIDJAN     = { lat:6.5244,   lon:3.3792,  name:'LAGOS',   coord:'6.5244°N, 3.3792°E'   }
const NAIROBI_CITY = { lat:-1.2921, lon:36.8219, name:'NAIROBI', coord:'1.2921°S, 36.8219°E'  }
const LAGOS_CITY   = { lat:6.5244,  lon:3.3792,  name:'LAGOS',   coord:'6.5244°N, 3.3792°E'   }

function _n(lat,lon){
  const φ=lat*Math.PI/180, λ=lon*Math.PI/180
  return new Vector3(Math.cos(φ)*Math.sin(λ), Math.sin(φ), Math.cos(φ)*Math.cos(λ))
}
const PARIS_N    = _n(51.5074, -0.1278)
const ABIDJAN_N  = _n(6.5244,   3.3792)
const NAIROBI_N  = _n(-1.2921,  36.8219)
const LAGOS_N    = _n(6.5244,   3.3792)
// Geographic center of Africa — used for continent-wide fill luminosity gradient
const AFRICA_CENTER_N = _n(5, 20)

const S3_ARCS = [
  { from:{ lat:6.5244,   lon:3.3792,  name:'LAGOS',        coord:'6.5244°N, 3.3792°E'   }, to:{ lat:40.7128,  lon:-74.006  }, offset:0.0 },
  { from:{ lat:-1.2921,  lon:36.8219, name:'NAIROBI',      coord:'1.2921°S, 36.8219°E'  }, to:{ lat:25.2048,  lon:55.2708  }, offset:0.6 },
  { from:{ lat:5.6037,   lon:-0.187,  name:'ACCRA',        coord:'5.6037°N, 0.1870°W'   }, to:{ lat:40.7128,  lon:-74.006  }, offset:1.2 },
  { from:{ lat:-26.2041, lon:28.0473, name:'JOHANNESBURG', coord:'26.2041°S, 28.0473°E' }, to:{ lat:1.3521,   lon:103.8198 }, offset:1.8 },
  { from:{ lat:33.5731,  lon:-7.5898, name:'CASABLANCA',   coord:'33.5731°N, 7.5898°W'  }, to:{ lat:-23.5505, lon:-46.6333 }, offset:2.4 },
]

const AFRICAN_CITIES=[
  {lat:6.5244,   lon:3.3792  }, // Lagos
  {lat:-1.2921,  lon:36.8219 }, // Nairobi
  {lat:5.6037,   lon:-0.1870 }, // Accra
  {lat:-26.2041, lon:28.0473 }, // Johannesburg
  {lat:33.5731,  lon:-7.5898 }, // Casablanca
  {lat:14.7167,  lon:-17.4677}, // Dakar
  {lat:0.3476,   lon:32.5825 }, // Kampala
  {lat:-4.3317,  lon:15.3322 }, // Kinshasa
  {lat:9.0249,   lon:38.7469 }, // Addis Ababa
  {lat:5.3600,   lon:-4.0083 }, // Abidjan
]
const WORLD_CITIES=[
  {lat:51.5074,  lon:-0.1278 }, // London
  {lat:25.2048,  lon:55.2708 }, // Dubai
  {lat:40.7128,  lon:-74.006 }, // New York
  {lat:1.3521,   lon:103.8198}, // Singapore
  {lat:-23.5505, lon:-46.6333}, // São Paulo
  {lat:48.8566,  lon:2.3522  }, // Paris
  {lat:19.0760,  lon:72.8777 }, // Mumbai
  {lat:31.2304,  lon:121.4737}, // Shanghai
  {lat:35.6762,  lon:139.6503}, // Tokyo
  {lat:-33.8688, lon:151.2093}, // Sydney
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)) }
function lerp(a,b,t){ return a+(b-a)*t }

function latLonToVec3(lat,lon,r=1){
  const φ=lat*Math.PI/180, λ=lon*Math.PI/180
  return new Vector3(r*Math.cos(φ)*Math.sin(λ), r*Math.sin(φ), r*Math.cos(φ)*Math.cos(λ))
}

function arcPoints(lat1,lon1,lat2,lon2,rBase=1.05,rApex=null,n=60){
  const a=latLonToVec3(lat1,lon1), b=latLonToVec3(lat2,lon2)
  const apex=rApex??rBase
  const pts=[]
  for(let i=0;i<=n;i++){
    const t=i/n
    const r=rBase+(apex-rBase)*Math.sin(t*Math.PI)
    pts.push(new Vector3().copy(a).lerp(b,t).normalize().multiplyScalar(r))
  }
  return pts
}

function stBlend(scroll,start,end,fade=0.025){
  if(scroll<start-fade||scroll>end+fade) return 0
  if(scroll>=start&&scroll<=end) return 1
  if(scroll<start) return clamp((scroll-(start-fade))/fade,0,1)
  return clamp(1-(scroll-end)/fade,0,1)
}

// ── Orbital ring helper — draws a tilted great circle on the 2D overlay canvas ──
// Points where z ≤ -R*0.05 (back hemisphere) are skipped with path breaks
// so the ring naturally disappears behind the globe without extra clipping.
function drawOrbitalRing(ctx,cx,cy,R,time,speed,tiltDeg,opacity,lineWidth){
  const tilt=tiltDeg*Math.PI/180
  const offset=time*speed
  ctx.beginPath()
  let drawing=false
  for(let i=0;i<=120;i++){
    const angle=(i/120)*Math.PI*2+offset
    const x0=Math.cos(angle)*R
    const y0=Math.sin(angle)*R*Math.cos(tilt)
    const z0=Math.sin(angle)*R*Math.sin(tilt)
    if(z0>-R*0.05){
      const sx=cx+x0, sy=cy+y0
      if(!drawing){ctx.moveTo(sx,sy);drawing=true}
      else ctx.lineTo(sx,sy)
    } else {
      drawing=false
    }
  }
  ctx.strokeStyle=`rgba(30,28,24,${opacity})`
  ctx.lineWidth=lineWidth
  ctx.stroke()
}

// Draw city label canvas in the given hex accent color; store metadata for regen
function makeLabelSprite(cityName,coordStr,hexColor='#FFC522'){
  const canvas=document.createElement('canvas')
  canvas.width=512; canvas.height=128
  const ctx=canvas.getContext('2d')
  ctx.clearRect(0,0,512,128)
  ctx.textBaseline='top'
  ctx.font='bold 32px "JetBrains Mono",monospace'
  ctx.fillStyle=hexColor
  ctx.fillText(cityName,0,8)
  if(coordStr){
    ctx.font='32px "JetBrains Mono",monospace'
    ctx.globalAlpha=0.80
    ctx.fillStyle=hexColor
    ctx.fillText(coordStr,0,50)
    ctx.globalAlpha=1
  }
  const tex=new CanvasTexture(canvas)
  tex.colorSpace=SRGBColorSpace
  const mat=new SpriteMaterial({map:tex,transparent:true,depthWrite:false,alphaTest:0.01})
  const spr=new Sprite(mat)
  spr.scale.set(0.50,0.125,1)
  spr.renderOrder=6
  spr._meta={type:'city',cityName,coordStr}
  return spr
}

// Draw country label canvas in the given hex accent color; store metadata for regen
function makeCountryLabel(name,cur,hexColor='#FFC522'){
  const text=`${name} · ${cur}`
  const canvas=document.createElement('canvas')
  const ctx=canvas.getContext('2d')
  ctx.font='32px "JetBrains Mono",monospace'
  const tw=ctx.measureText(text).width
  canvas.width=Math.ceil(tw)+8
  canvas.height=48
  ctx.font='32px "JetBrains Mono",monospace'
  ctx.fillStyle=hexColor
  ctx.textBaseline='middle'
  ctx.fillText(text,4,24)
  const tex=new CanvasTexture(canvas)
  tex.colorSpace=SRGBColorSpace
  const mat=new SpriteMaterial({map:tex,transparent:true,depthWrite:false,alphaTest:0.01})
  const spr=new Sprite(mat)
  spr.scale.set(canvas.width*0.00065,canvas.height*0.00065,1)
  spr.renderOrder=6
  spr._meta={type:'country',name,cur}
  return spr
}

// Regenerate a sprite's canvas texture with the new accent color — called once per threshold crossing
function regenSprite(spr,hexColor){
  const m=spr._meta
  const canvas=document.createElement('canvas')
  if(m.type==='city'){
    canvas.width=512; canvas.height=128
    const ctx=canvas.getContext('2d')
    ctx.clearRect(0,0,512,128)
    ctx.textBaseline='top'
    ctx.font='bold 32px "JetBrains Mono",monospace'
    ctx.fillStyle=hexColor
    ctx.fillText(m.cityName,0,8)
    if(m.coordStr){
      ctx.font='32px "JetBrains Mono",monospace'
      ctx.globalAlpha=0.80
      ctx.fillStyle=hexColor
      ctx.fillText(m.coordStr,0,50)
      ctx.globalAlpha=1
    }
  } else {
    const text=`${m.name} · ${m.cur}`
    const ctx=canvas.getContext('2d')
    ctx.font='32px "JetBrains Mono",monospace'
    const tw=ctx.measureText(text).width
    canvas.width=Math.ceil(tw)+8
    canvas.height=48
    ctx.font='32px "JetBrains Mono",monospace'
    ctx.fillStyle=hexColor
    ctx.textBaseline='middle'
    ctx.fillText(text,4,24)
  }
  if(spr.material.map) spr.material.map.dispose()
  const map=new CanvasTexture(canvas)
  map.colorSpace=SRGBColorSpace
  spr.material.map=map
  spr.material.needsUpdate=true
}

function makeCityMarker(){
  return new Mesh(
    new PlaneGeometry(0.04,0.04),
    new MeshBasicMaterial({color:0x73A9F4,transparent:true,opacity:0,side:DoubleSide,depthWrite:false})
  )
}

function makeDot(r=0.022){
  return new Mesh(
    new SphereGeometry(r,8,8),
    new MeshBasicMaterial({color:0x73A9F4,transparent:true,opacity:0,depthWrite:false})
  )
}

// Graticule grid lines at r=0.998 — per-line objects for Effect B shimmer animation.
// Returns {latLines:[{line,lat}], lonLines:[{line,lon}]} — equator in latLines, prime meridian in lonLines.
function makeGraticule(){
  const r=0.998, N=64
  const latLines=[], lonLines=[]
  const makeLS=(pos,opacity)=>{
    const geo=new BufferGeometry()
    geo.setAttribute('position',new BufferAttribute(new Float32Array(pos),3))
    const ls=new LineSegments(geo,new LineBasicMaterial({
      color:0xffffff,transparent:true,opacity,depthWrite:false
    }))
    ls.renderOrder=0
    return ls
  }
  // Latitude lines (including equator at lat=0)
  for(let lat=-80;lat<=80;lat+=10){
    const pos=[]
    for(let i=0;i<N;i++){
      const v0=latLonToVec3(lat,-180+(360*i/N),r)
      const v1=latLonToVec3(lat,-180+(360*(i+1)/N),r)
      pos.push(v0.x,v0.y,v0.z,v1.x,v1.y,v1.z)
    }
    const initOp=lat===0?0.35:lat%30===0?0.25:0.12
    latLines.push({line:makeLS(pos,initOp),lat})
  }
  // Longitude lines (including prime meridian at lon=0)
  for(let lon=-180;lon<180;lon+=10){
    const pos=[]
    for(let i=0;i<N;i++){
      const v0=latLonToVec3(-90+(180*i/N),lon,r)
      const v1=latLonToVec3(-90+(180*(i+1)/N),lon,r)
      pos.push(v0.x,v0.y,v0.z,v1.x,v1.y,v1.z)
    }
    const initOp=lon===0?0.35:lon%30===0?0.25:0.12
    lonLines.push({line:makeLS(pos,initOp),lon})
  }
  return{latLines,lonLines}
}

// GLSL shaders for African country radial gradient fill
const AFRICA_VERT=`
  varying vec3 vPosition;
  varying vec3 vNormal;
  void main(){
    vNormal=normalize(normalMatrix*normal);
    vPosition=position;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
  }
`
const AFRICA_FRAG=`
  uniform vec3 uColor;
  uniform vec3 uAfricaCenter;
  uniform float uOpacity;
  uniform vec3 uTintColor;
  uniform float uTintOpacity;
  varying vec3 vPosition;
  varying vec3 vNormal;
  void main(){
    // Angular distance from Africa's geographic center (lat 5N, lon 20E).
    // Vertices within 0° → opacity 0.10; at 40° and beyond → opacity 0.04.
    float cosAngle=clamp(dot(normalize(vPosition),uAfricaCenter),-1.0,1.0);
    float t=clamp(acos(cosAngle)/0.6981,0.0,1.0);
    float fillOp=mix(0.10,0.04,t);
    float facing=dot(vNormal,vec3(0.0,0.0,1.0));
    float facingFactor=0.3+max(facing,0.0)*0.7;
    float baseAlpha=fillOp*facingFactor*uOpacity;
    float tintAlpha=fillOp*facingFactor*uTintOpacity;
    float totalAlpha=baseAlpha+tintAlpha;
    vec3 col=totalAlpha>0.0?(uColor*baseAlpha+uTintColor*tintAlpha)/totalAlpha:uColor;
    gl_FragColor=vec4(col,totalAlpha);
  }
`

// Build sphere-projected Mesh + border LineSegments from polygon rings.
// Each country ring is triangulated in flat lat/lon space then projected to r=1.0.
// Borders: inner stroke at r=1.001, outer stroke at r=1.0018 for double-stroke depth effect.
// isAfrica: Africa rings get a radial gradient ShaderMaterial; others get MeshLambertMaterial.
function buildCountryObjects(rings, isAfrica){
  const meshes=[]
  const borderPos=[]
  const borderPosOuter=[]

  for(const pts of rings){
    if(pts.length<3) continue

    try{
      const lons=pts.map(v=>Math.atan2(v.x,v.z)*180/Math.PI)
      const lats=pts.map(v=>Math.asin(clamp(v.y/Math.max(v.length(),1e-6),-1,1))*180/Math.PI)
      const shape=new Shape()
      shape.moveTo(lons[0],lats[0])
      for(let i=1;i<lons.length;i++) shape.lineTo(lons[i],lats[i])
      const sGeo=new ShapeGeometry(shape)
      const p2=sGeo.attributes.position.array
      const v3=new Float32Array(p2.length)
      for(let i=0;i<p2.length;i+=3){
        const v=latLonToVec3(p2[i+1],p2[i],1.0)
        v3[i]=v.x; v3[i+1]=v.y; v3[i+2]=v.z
      }
      const geo3=new BufferGeometry()
      geo3.setAttribute('position',new BufferAttribute(v3,3))
      if(sGeo.index) geo3.setIndex(sGeo.index)
      sGeo.dispose()
      geo3.computeVertexNormals()

      let mat
      if(isAfrica){
        mat=new ShaderMaterial({
          uniforms:{
            uColor:{value:new Color(0xf0ede6)},
            uAfricaCenter:{value:AFRICA_CENTER_N},
            uOpacity:{value:1.0},
            uTintColor:{value:new Color(0xFFC522)},
            uTintOpacity:{value:0.0},
          },
          vertexShader:AFRICA_VERT,
          fragmentShader:AFRICA_FRAG,
          transparent:true,
          depthWrite:false,
          side:DoubleSide,
          polygonOffset:true,
          polygonOffsetFactor:-1,
          polygonOffsetUnits:-1,
        })
      } else {
        mat=new MeshLambertMaterial({
          color:0xe8e6e2,transparent:true,opacity:0.04,
          side:DoubleSide,depthWrite:false,
          polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
        })
      }
      const _m=new Mesh(geo3,mat)
      _m.renderOrder=1
      meshes.push(_m)
    }catch(err){
      console.error('[buildCountryObjects] Ring build failed:', err)
    }

    // Africa borders are handled as aggregated coast/internal layers — skip per-country borders
    if(!isAfrica){
      // Closed border loop: inner at r=1.001, outer at r=1.0018 for double-stroke depth
      const N=pts.length
      for(let i=0;i<N;i++){
        const a=pts[i].clone().normalize().multiplyScalar(1.001)
        const b=pts[(i+1)%N].clone().normalize().multiplyScalar(1.001)
        borderPos.push(a.x,a.y,a.z,b.x,b.y,b.z)
        const a2=pts[i].clone().normalize().multiplyScalar(1.0018)
        const b2=pts[(i+1)%N].clone().normalize().multiplyScalar(1.0018)
        borderPosOuter.push(a2.x,a2.y,a2.z,b2.x,b2.y,b2.z)
      }
    }
  }

  let borders=null, bordersOuter=null
  if(!isAfrica && borderPos.length>=6){
    const geo=new BufferGeometry()
    geo.setAttribute('position',new BufferAttribute(new Float32Array(borderPos),3))
    borders=new LineSegments(geo,new LineBasicMaterial({
      color:0xffffff,transparent:true,opacity:0.08,depthWrite:false
    }))
    borders.renderOrder=2
    const geo2=new BufferGeometry()
    geo2.setAttribute('position',new BufferAttribute(new Float32Array(borderPosOuter),3))
    bordersOuter=new LineSegments(geo2,new LineBasicMaterial({
      color:0xffffff,transparent:true,opacity:0,depthWrite:false
    }))
    bordersOuter.renderOrder=2
  }
  return {meshes,borders,bordersOuter}
}

function centroidNormal(rings){
  const sum=new Vector3(); let n=0
  for(const pts of rings) for(const p of pts){sum.add(p);n++}
  return n>0?sum.divideScalar(n).normalize():new Vector3(0,0,1)
}

function ringCentroid(pts){
  let minLa=Infinity,maxLa=-Infinity,minLo=Infinity,maxLo=-Infinity
  for(const v of pts){
    const la=Math.asin(clamp(v.y/Math.max(v.length(),0.001),-1,1))*180/Math.PI
    const lo=Math.atan2(v.x,v.z)*180/Math.PI
    if(la<minLa)minLa=la; if(la>maxLa)maxLa=la
    if(lo<minLo)minLo=lo; if(lo>maxLo)maxLo=lo
  }
  return{lat:(minLa+maxLa)/2,lon:(minLo+maxLo)/2}
}

function makeDecoder(world){
  const{arcs,transform:{scale,translate}}=world
  return function decode(idx){
    const rev=idx<0
    const raw=arcs[rev?~idx:idx]
    let x=0,y=0
    const pts=raw.map(([dx,dy])=>{x+=dx;y+=dy;return[y*scale[1]+translate[1],x*scale[0]+translate[0]]})
    return rev?pts.reverse():pts
  }
}


// ── Component ─────────────────────────────────────────────────────────────────
const GlobeCanvas = memo(function GlobeCanvas({scrollProgressRef, globeScrollOverrideRef}){
  const containerRef=useRef(null)

  useEffect(()=>{
    const container=containerRef.current
    if(!container) return

    // Read motion preference once on mount; ref allows the change listener to update it
    const _rmMQ=window.matchMedia('(prefers-reduced-motion: reduce)')
    const prefersReducedMotionRef={current:_rmMQ.matches}
    const _onRMChange=(e)=>{ prefersReducedMotionRef.current=e.matches }
    _rmMQ.addEventListener('change',_onRMChange)

    const W=container.clientWidth, H=container.clientHeight
    const renderer=new WebGLRenderer({antialias:true,alpha:true})
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))
    renderer.setSize(W,H)
    renderer.setClearColor(0x000000,0)
    renderer.outputColorSpace=SRGBColorSpace
    container.appendChild(renderer.domElement)
    const cv=renderer.domElement
    const wrapperDiv=container

    // 2D overlay canvas for Effect A (rim pulse) and Effect C (coastline trace)
    container.style.position='relative'
    const overlayCanvas=document.createElement('canvas')
    overlayCanvas.width=W; overlayCanvas.height=H
    overlayCanvas.style.cssText='position:absolute;top:0;left:0;pointer-events:none;'
    container.appendChild(overlayCanvas)
    const overlayCtx=overlayCanvas.getContext('2d')

    // Shared hover boost (lerped 0→1 on hover, used by Effects A and B)
    let hoverBoost=0

    // Reusable vectors for overlay projection (avoid per-frame allocation)
    const _oc=new Vector3(), _op=new Vector3()

    const scene=new Scene()
    // Subtle directional light for MeshLambertMaterial country fill shading
    const dirLight=new DirectionalLight(0xffffff,0.15)
    dirLight.position.set(5,3,5)
    scene.add(dirLight)
    const ambLight=new AmbientLight(0xffffff,0.85)
    scene.add(ambLight)
    const camera=new PerspectiveCamera(40,W/H,0.1,100)
    camera.position.set(0,0,4.8)
    const clock=new Clock()
    let prevElapsed=0

    const mouse=new Vector2(-99,-99)
    const raycaster=new Raycaster()
    let hoveredId=null
    const s5Meshes=[]
    const meshToId=new Map()

    const globeGroup=new Group()
    // Slight editorial offset — off-center presence matching Tempo reference
    globeGroup.position.set(0.15,0.08,0)
    globeGroup.scale.setScalar(GLOBE_SCALE)
    scene.add(globeGroup)

    // All country meshes + borders live here
    const countryGroup=new Group()
    globeGroup.add(countryGroup)

    // Graticule at r=0.998 — per-line objects for Effect B shimmer
    const {latLines:gratLatLines,lonLines:gratLonLines}=makeGraticule()
    for(const{line} of gratLatLines) globeGroup.add(line)
    for(const{line} of gratLonLines) globeGroup.add(line)

    // Fresnel rim highlight — soft luminous halo at the globe silhouette edge
    const rimMat=new ShaderMaterial({
      uniforms:{uFresnelStrength:{value:0.12}},
      vertexShader:`
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main(){
          vNormal=normalize(normalMatrix*normal);
          vec4 mvPosition=modelViewMatrix*vec4(position,1.0);
          vViewDir=normalize(-mvPosition.xyz);
          gl_Position=projectionMatrix*mvPosition;
        }
      `,
      fragmentShader:`
        uniform float uFresnelStrength;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main(){
          float fresnel=1.0-max(dot(vNormal,vViewDir),0.0);
          fresnel=pow(fresnel,3.5);
          gl_FragColor=vec4(1.0,1.0,1.0,fresnel*uFresnelStrength);
        }
      `,
      transparent:true,
      depthWrite:false,
      side:BackSide,
    })
    const rimMesh=new Mesh(new SphereGeometry(1.01,64,64),rimMat)
    rimMesh.renderOrder=5
    globeGroup.add(rimMesh)

    const allLabels=[]

    // ── Arc 1: Paris → Abidjan ────────────────────────────────────────────────
    const arc1Pts=arcPoints(PARIS.lat,PARIS.lon,ABIDJAN.lat,ABIDJAN.lon,1.05,1.12)
    const arc1Crv=new CatmullRomCurve3(arc1Pts)
    const arc1Line=new Line(new BufferGeometry().setFromPoints(arc1Pts),
      new LineBasicMaterial({color:0x73A9F4,transparent:true,opacity:0,depthWrite:false}))
    arc1Line.renderOrder=4
    const arc1Dot=makeDot(); arc1Dot.material.opacity=0; arc1Dot.renderOrder=4
    const mParis=makeCityMarker(); mParis.renderOrder=4
    mParis.position.copy(latLonToVec3(PARIS.lat,PARIS.lon,1.02))
    const mAbidjan=makeCityMarker(); mAbidjan.renderOrder=4
    mAbidjan.position.copy(latLonToVec3(ABIDJAN.lat,ABIDJAN.lon,1.02))
    const lParis=makeLabelSprite(PARIS.name,PARIS.coord)
    lParis.position.copy(latLonToVec3(PARIS.lat,PARIS.lon,1.02)).add(new Vector3(0.08,0.06,0))
    lParis.material.opacity=0
    const lAbidjan=makeLabelSprite(ABIDJAN.name,ABIDJAN.coord)
    lAbidjan.position.copy(latLonToVec3(ABIDJAN.lat,ABIDJAN.lon,1.02)).add(new Vector3(0.08,0.06,0))
    lAbidjan.material.opacity=0
    allLabels.push(lParis,lAbidjan)
    const arc1Group=new Group()
    arc1Group.add(arc1Line,arc1Dot,mParis,mAbidjan,lParis,lAbidjan)
    globeGroup.add(arc1Group)

    // ── Arc 2: Nairobi → Lagos ────────────────────────────────────────────────
    const arc2Pts=arcPoints(NAIROBI_CITY.lat,NAIROBI_CITY.lon,LAGOS_CITY.lat,LAGOS_CITY.lon,1.05,1.12)
    const arc2Crv=new CatmullRomCurve3(arc2Pts)
    const arc2Line=new Line(new BufferGeometry().setFromPoints(arc2Pts),
      new LineBasicMaterial({color:0x73A9F4,transparent:true,opacity:0,depthWrite:false}))
    arc2Line.renderOrder=4
    const arc2Dot=makeDot(); arc2Dot.material.opacity=0; arc2Dot.renderOrder=4
    const mNairobi=makeCityMarker(); mNairobi.renderOrder=4
    mNairobi.position.copy(latLonToVec3(NAIROBI_CITY.lat,NAIROBI_CITY.lon,1.02))
    const mLagos=makeCityMarker(); mLagos.renderOrder=4
    mLagos.position.copy(latLonToVec3(LAGOS_CITY.lat,LAGOS_CITY.lon,1.02))
    const lNairobi=makeLabelSprite(NAIROBI_CITY.name,NAIROBI_CITY.coord)
    lNairobi.position.copy(latLonToVec3(NAIROBI_CITY.lat,NAIROBI_CITY.lon,1.02)).add(new Vector3(0.08,0.06,0))
    lNairobi.material.opacity=0
    const lLagos=makeLabelSprite(LAGOS_CITY.name,LAGOS_CITY.coord)
    lLagos.position.copy(latLonToVec3(LAGOS_CITY.lat,LAGOS_CITY.lon,1.02)).add(new Vector3(0.08,0.06,0))
    lLagos.material.opacity=0
    allLabels.push(lNairobi,lLagos)
    const arc2Group=new Group()
    arc2Group.add(arc2Line,arc2Dot,mNairobi,mLagos,lNairobi,lLagos)
    globeGroup.add(arc2Group)

    // ── Arcs 3: 5 simultaneous ────────────────────────────────────────────────
    const arc3Group=new Group()
    const arc3Data=S3_ARCS.map(a=>{
      const pts=arcPoints(a.from.lat,a.from.lon,a.to.lat,a.to.lon,1.05,1.12)
      const crv=new CatmullRomCurve3(pts)
      const line=new Line(new BufferGeometry().setFromPoints(pts),
        new LineBasicMaterial({color:0x73A9F4,transparent:true,opacity:0,depthWrite:false}))
      line.renderOrder=4
      const dot=makeDot(); dot.material.opacity=0; dot.renderOrder=4
      const halo=new Mesh(new SphereGeometry(0.05,8,8),
        new MeshBasicMaterial({color:0x73A9F4,transparent:true,opacity:0,depthWrite:false}))
      halo.renderOrder=4
      const marker=makeCityMarker(); marker.renderOrder=4
      marker.position.copy(latLonToVec3(a.from.lat,a.from.lon,1.02))
      const lbl=makeLabelSprite(a.from.name,a.from.coord)
      lbl.position.copy(latLonToVec3(a.from.lat,a.from.lon,1.02)).add(new Vector3(0.08,0.06,0))
      lbl.material.opacity=0
      allLabels.push(lbl)
      arc3Group.add(line,halo,dot,marker,lbl)
      return{crv,line,dot,halo,marker,lbl,offset:a.offset,fromNormal:_n(a.from.lat,a.from.lon)}
    })
    globeGroup.add(arc3Group)

    // ── State 4 dense arc pool ────────────────────────────────────────────────
    const S4_POOL_SIZE=navigator.hardwareConcurrency<4?35:50
    const s4Pool=[]
    for(let i=0;i<S4_POOL_SIZE;i++){
      const posArr=new Float32Array(30*3)
      const geo=new BufferGeometry()
      geo.setAttribute('position',new BufferAttribute(posArr,3))
      const line=new Line(geo,new LineBasicMaterial({
        color:0xFFCC00,transparent:true,opacity:0,depthWrite:false
      }))
      const dot=new Mesh(
        new SphereGeometry(0.012,6,6),
        new MeshBasicMaterial({color:0xFFCC00,transparent:true,opacity:0,depthWrite:false})
      )
      // Glow halo — 2.5× radius, shown only on blue bg for warm luminous effect
      const halo=new Mesh(
        new SphereGeometry(0.030,6,6),
        new MeshBasicMaterial({color:0xFFCC00,transparent:true,opacity:0,depthWrite:false})
      )
      line.renderOrder=4; dot.renderOrder=4; halo.renderOrder=4
      globeGroup.add(line,dot,halo)
      s4Pool.push({line,dot,halo,posArr,pts:Array.from({length:30},()=>new Vector3()),
        active:false,startTime:0,duration:1.0})
    }
    let s4ArcFadeStart=-1
    const _spA=new Vector3(),_spB=new Vector3(),_spC=new Vector3()
    const _dotPos=new Vector3()
    function spawnArc(slot,t){
      const fc=AFRICAN_CITIES[Math.floor(Math.random()*AFRICAN_CITIES.length)]
      let tc
      if(Math.random()<0.4){ tc=WORLD_CITIES[Math.floor(Math.random()*WORLD_CITIES.length)] }
      else{
        let idx; do{idx=Math.floor(Math.random()*AFRICAN_CITIES.length)}while(AFRICAN_CITIES[idx]===fc)
        tc=AFRICAN_CITIES[idx]
      }
      const φA=fc.lat*Math.PI/180,λA=fc.lon*Math.PI/180
      const φB=tc.lat*Math.PI/180,λB=tc.lon*Math.PI/180
      _spA.set(Math.cos(φA)*Math.sin(λA),Math.sin(φA),Math.cos(φA)*Math.cos(λA))
      _spB.set(Math.cos(φB)*Math.sin(λB),Math.sin(φB),Math.cos(φB)*Math.cos(λB))
      for(let i=0;i<30;i++){
        const s=i/29,r=1.0+0.08*Math.sin(s*Math.PI)
        _spC.copy(_spA).lerp(_spB,s).normalize().multiplyScalar(r)
        slot.pts[i].copy(_spC)
        slot.posArr[i*3]=_spC.x; slot.posArr[i*3+1]=_spC.y; slot.posArr[i*3+2]=_spC.z
      }
      slot.line.geometry.attributes.position.needsUpdate=true
      slot.active=true; slot.startTime=t; slot.duration=0.6+Math.random()*0.6
    }

    // ── Country + S5 data (populated after fetch) ─────────────────────────────
    const countries=[]  // {id, meshes, borders, normal, isAfrica, isEurope, isSupported, rings}
    const s5Data=[]     // {entry, labelSprite, activatedAt}
    const s5DataMap={}  // id → s5Data entry
    let dataReady=false
    let s5LitCount=0, s5StartTime=-1, s5AllLitAt=-1
    // Africa border hierarchy (built in fetch; null until ready)
    let africaCoastLine=null, africaCoastBaseLine=null, africaInternalLine=null

    performance.mark('topo-fetch-start')
    getTopoData()
      .then(world=>{
        if(!renderer.domElement.isConnected) return
        performance.mark('topo-fetch-end')
        performance.measure('topo-fetch','topo-fetch-start','topo-fetch-end')
        const decode=makeDecoder(world)

        function processGeo(geo){
          const rings=[]
          const addRing=idxArr=>{
            const pts=idxArr.flatMap(i=>decode(i)).map(([la,lo])=>latLonToVec3(la,lo,1.0))
            if(pts.length>=3) rings.push(pts)
          }
          if(geo.type==='Polygon') geo.arcs.forEach(addRing)
          else if(geo.type==='MultiPolygon') geo.arcs.forEach(p=>p.forEach(addRing))
          return rings
        }

        performance.mark('globe-build-start')
        for(const geo of world.objects.countries.geometries){
          const id=Number(geo.id)
          const rings=processGeo(geo)
          if(!rings.length) continue
          const{meshes,borders,bordersOuter}=buildCountryObjects(rings,AFRICA_IDS.has(id))
          if(!meshes.length&&!borders) continue
          const entry={
            id,meshes,borders,bordersOuter,rings,
            normal:centroidNormal(rings),
            isAfrica:AFRICA_IDS.has(id),
            isEurope:EUROPE_IDS.has(id),
            isSupported:SUPPORTED_IDS.has(id),
          }
          countries.push(entry)
          for(const m of meshes) countryGroup.add(m)
          if(borders) countryGroup.add(borders)
          if(bordersOuter) countryGroup.add(bordersOuter)
        }

        // ── Africa border hierarchy ────────────────────────────────────────────
        // First pass: count how many African features use each arc index.
        // Canon index = absolute value (negative arcs are the same arc, reversed).
        // Count === 1 → coastline/external; count >= 2 → internal country border.
        const africaArcUse=new Map()
        for(const geo of world.objects.countries.geometries){
          if(!AFRICA_IDS.has(Number(geo.id))) continue
          const visit=idx=>{
            const c=idx<0?~idx:idx
            africaArcUse.set(c,(africaArcUse.get(c)||0)+1)
          }
          if(geo.type==='Polygon') geo.arcs.forEach(ring=>ring.forEach(visit))
          else if(geo.type==='MultiPolygon') geo.arcs.forEach(poly=>poly.forEach(ring=>ring.forEach(visit)))
        }

        // Second pass: decode each unique Africa arc once, route to coast or internal.
        // latLonToVec3 at r=1.0 returns a unit vector; multiplying x/y/z by 1.001/1.0018
        // scales to the desired render radius without a clone+normalize step.
        const africaCoastPos=[], africaCoastBasePos=[], africaInternalPos=[]
        const processedArcs=new Set()
        for(const geo of world.objects.countries.geometries){
          if(!AFRICA_IDS.has(Number(geo.id))) continue
          const processRing=ring=>{
            for(const arcIdx of ring){
              const canon=arcIdx<0?~arcIdx:arcIdx
              if(processedArcs.has(canon)) continue
              processedArcs.add(canon)
              const isCoast=(africaArcUse.get(canon)||1)===1
              const rawPts=decode(arcIdx).map(([la,lo])=>latLonToVec3(la,lo,1.0))
              for(let i=0;i<rawPts.length-1;i++){
                const a=rawPts[i], b=rawPts[i+1]
                // Cause 2: skip NaN vertices from degenerate arc projection
                if(isNaN(a.x)||isNaN(a.y)||isNaN(a.z)||isNaN(b.x)||isNaN(b.y)||isNaN(b.z)) continue
                // Cause 2: skip zero-length segments (Three.js silently drops them, leaving gaps)
                if(a.distanceTo(b)<0.0001) continue
                if(isCoast){
                  // Main stroke at r=1.0018; glow halo outward by 0.002 → r=1.0038
                  africaCoastPos.push(a.x*1.0018,a.y*1.0018,a.z*1.0018,b.x*1.0018,b.y*1.0018,b.z*1.0018)
                  africaCoastBasePos.push(a.x*1.0038,a.y*1.0038,a.z*1.0038,b.x*1.0038,b.y*1.0038,b.z*1.0038)
                } else {
                  africaInternalPos.push(a.x*1.001,a.y*1.001,a.z*1.001,b.x*1.001,b.y*1.001,b.z*1.001)
                }
              }
            }
          }
          if(geo.type==='Polygon') geo.arcs.forEach(processRing)
          else if(geo.type==='MultiPolygon') geo.arcs.forEach(poly=>poly.forEach(processRing))
        }

        const makeAfricaLS=(pos,opacity,renderOrder)=>{
          const geo=new BufferGeometry()
          geo.setAttribute('position',new BufferAttribute(new Float32Array(pos),3))
          const ls=new LineSegments(geo,new LineBasicMaterial({
            color:0xffffff,transparent:true,opacity,depthWrite:false
          }))
          ls.renderOrder=renderOrder
          return ls
        }
        if(africaCoastPos.length>=6){
          // Cause 3: glow halo at renderOrder 2 with depthTest:false — never z-fights with main stroke
          africaCoastBaseLine=makeAfricaLS(africaCoastBasePos,0.12,2)
          africaCoastBaseLine.material.depthTest=false
          // Cause 3: main stroke at renderOrder 3 with depthTest:true — sits above glow
          africaCoastLine=makeAfricaLS(africaCoastPos,0.92,3)
          africaCoastLine.material.depthTest=true
          countryGroup.add(africaCoastBaseLine,africaCoastLine)
        }
        if(africaInternalPos.length>=6){
          africaInternalLine=makeAfricaLS(africaInternalPos,0.30,2)
          countryGroup.add(africaInternalLine)
        }

        const totalArcCount=(africaCoastPos.length+africaInternalPos.length)/6
        if(import.meta.env.DEV) console.log('Globe scene ready —',totalArcCount,'arc segments loaded')

        // Build s5Data in SUPPORTED illumination order
        const byId={}
        for(const c of countries) byId[c.id]=c
        for(const ctry of SUPPORTED){
          const entry=byId[ctry.id]
          if(!entry){s5Data.push(null);continue}
          const{lat,lon}=ringCentroid(entry.rings.flat())
          const lbl=makeCountryLabel(ctry.name,ctry.cur)
          lbl.position.copy(latLonToVec3(lat,lon,1.20))
          lbl.material.opacity=0
          countryGroup.add(lbl)
          allLabels.push(lbl)
          // Per-country border lines for three-phase reveal animation
          const cBorderPos=[]
          for(const pts of entry.rings){
            const N=pts.length
            for(let i=0;i<N;i++){
              const a=pts[i].clone().normalize().multiplyScalar(1.002)
              const b=pts[(i+1)%N].clone().normalize().multiplyScalar(1.002)
              cBorderPos.push(a.x,a.y,a.z,b.x,b.y,b.z)
            }
          }
          let countryBorder=null
          if(cBorderPos.length>=6){
            const cbGeo=new BufferGeometry()
            cbGeo.setAttribute('position',new BufferAttribute(new Float32Array(cBorderPos),3))
            countryBorder=new LineSegments(cbGeo,new LineBasicMaterial({
              color:0xffffff,transparent:true,opacity:0,depthWrite:false
            }))
            countryBorder.renderOrder=4
            countryGroup.add(countryBorder)
          }
          const sd={entry,labelSprite:lbl,activatedAt:-999,countryBorder}
          s5Data.push(sd)
          s5DataMap[entry.id]=sd
        }
        // Pre-build mesh → country-id lookup for raycasting
        for(const sd of s5Data){
          if(!sd) continue
          for(const m of sd.entry.meshes){s5Meshes.push(m);meshToId.set(m,sd.entry.id)}
        }
        performance.mark('globe-build-end')
        performance.measure('globe-build','globe-build-start','globe-build-end')
        dataReady=true
      })
      .catch((err)=>{
        console.error('[GlobeCanvas] TopoJSON pipeline failed:', err)
      })

    // ── Idle animation — 80 particles drifting along latitude lines ──────────
    // Initialised once; a0 = starting longitude, speed in rad/s (≈0.0003–0.0008 × 60)
    const idleParticles=[]
    for(let i=0;i<80;i++){
      idleParticles.push({
        lat:(Math.random()*140)-70,
        a0:Math.random()*Math.PI*2,
        speed:(0.0003+Math.random()*0.0005)*60,
        r:0.9+Math.random()*0.8,
      })
    }

    // ── Orientation ───────────────────────────────────────────────────────────
    let curX=ORI[0].x, curY=ORI[0].y

    // ── Intro animation state ─────────────────────────────────────────────────
    // When motion is reduced, skip the spin entirely — globe loads on Africa immediately
    let introComplete=prefersReducedMotionRef.current
    // Stamp the Africa-facing quaternion as the start/return target
    globeGroup.quaternion.setFromEuler(new Euler(curX,curY,0,'YXZ'))
    const startQuaternion=globeGroup.quaternion.clone()
    // Fixed per-frame Y rotation increment used during intro spin (quaternion only — no Euler)
    const _introFrameRot=new Quaternion()
    _introFrameRot.setFromAxisAngle(new Vector3(0,1,0),0.055)

    // Scroll during intro: cut immediately back to Africa
    const onIntroScroll=()=>{
      if(!introComplete&&window.scrollY>10){
        globeGroup.quaternion.copy(startQuaternion)
        curX=ORI[0].x; curY=ORI[0].y
        introComplete=true
      }
    }
    window.addEventListener('scroll',onIntroScroll,{once:true})

    const _tmp=new Vector3()
    const COL_DARK=new Color(0x1a1a18)
    const COL_WHITE=new Color(0xffffff)
    const COL_AFRICA_LIGHT=new Color(0xd8d6d0)  // warm off-white for Lambert shading on light bg
    const COL_OTHER_LIGHT=new Color(0xe8e6e2)   // warm off-white for other continents on light bg
    const ACCENT_BLUE=new Color(0x73A9F4)
    const ACCENT_YELLOW=new Color(0xFFCC00)
    const lineCol=new Color()
    const _fillCol=new Color()
    let prevAccentIsBlue=null  // null → forces apply on first frame
    let prevB3Active=false
    let _firstRenderMarked=false

    // ── Animation loop ────────────────────────────────────────────────────────
    const animate=()=>{
      const elapsed=clock.getElapsedTime()
      const dt=elapsed-prevElapsed; prevElapsed=elapsed
      const scroll=globeScrollOverrideRef?.current??scrollProgressRef.current
      const reduceMotion=prefersReducedMotionRef.current

      // Hover boost — lerps toward 1 when mouse is over the canvas, back to 0 when away
      const _isHovered=Math.abs(mouse.x)<=1.0&&Math.abs(mouse.y)<=1.0
      hoverBoost=lerp(hoverBoost,_isHovered?1.0:0.0,_isHovered?0.08:0.05)

      // ── Intro rotation — start on Africa, spin away, return home (3.4s) ────
      // Quaternion-only: no Euler rotation assignments anywhere in this block
      if(!introComplete){
        if(elapsed<0.4){
          // Phase 1: hold still
          globeGroup.quaternion.copy(startQuaternion)
        } else if(elapsed<1.8){
          // Phase 2: spin away — incremental quaternion multiply, constant speed
          globeGroup.quaternion.multiply(_introFrameRot)
        } else {
          // Phase 3: decelerate and slerp home — all quaternion, no Euler
          const rawProgress=Math.min((elapsed-1.8)/1.6,1.0)
          const eased=1-Math.pow(1-rawProgress,4)
          // Shrinking frame rotation — spin decays to zero
          const _frameRot=new Quaternion()
          _frameRot.setFromAxisAngle(new Vector3(0,1,0),0.055*(1-eased))
          globeGroup.quaternion.multiply(_frameRot)
          // Slerp toward home — grows as spin dies
          globeGroup.quaternion.slerp(startQuaternion,eased*eased*0.08)
          if(rawProgress>=1.0){
            globeGroup.quaternion.copy(startQuaternion)
            curX=ORI[0].x; curY=ORI[0].y
            introComplete=true
          }
        }
      }
      // ── End intro rotation ────────────────────────────────────────────────

      // effectsFade: intro runs at full State 0 values throughout — no fade-in needed
      const effectsFade=1

      const b0=stBlend(scroll,S0S,S0E)
      const b1=stBlend(scroll,S1S,S1E)
      const b2=stBlend(scroll,S2S,S2E)
      const b3=stBlend(scroll,S3S,S3E)
      const b4=stBlend(scroll,S4S,S4E)
      const b5=stBlend(scroll,S5S,S5E)

      // s4 arc fade tracking
      if(b5<=0.01) s4ArcFadeStart=-1
      if(b5>0.01&&s4ArcFadeStart<0) s4ArcFadeStart=elapsed

      // Compute scroll-driven target orientation
      let tX=ORI[0].x, tY=ORI[0].y
      if(b1>0){tX=lerp(tX,ORI[1].x,b1);tY=lerp(tY,ORI[1].y,b1)}
      if(b3>0){tX=lerp(tX,ORI[3].x,b3);tY=lerp(tY,ORI[3].y,b3)}
      if(b5>0){tX=lerp(tX,ORI[5].x,b5);tY=lerp(tY,ORI[5].y,b5)}

      // Scroll-driven orientation only — skipped during intro (intro owns rotation)
      if(introComplete){
        curX+=(tX-curX)*0.05
        curY+=(tY-curY)*0.05
        globeGroup.quaternion.setFromEuler(new Euler(curX,curY,0,'YXZ'))
      }

      // Globe scale: 1.0 normally, lerps to 0.75× in state 3
      const targetGlobeScale=GLOBE_SCALE*lerp(1.0,0.75,b3)
      globeGroup.scale.setScalar(lerp(globeGroup.scale.x,targetGlobeScale,0.05))

      // Country color: dark on light bg → white on dark bg
      // Background stays white until BG_BLUE_START, transitions to blue by BG_BLUE_MID (App.jsx bgColor keyframes)
      const whiteAmt=clamp((scroll-BG_BLUE_START)/(BG_BLUE_MID-BG_BLUE_START),0,1)
      // darkAmt: 0 = blue bg, 1 = dark bg (transition BG_DARK_START→BG_DARK_MID per App.jsx keyframes)
      const darkAmt=clamp((scroll-BG_DARK_START)/(BG_DARK_MID-BG_DARK_START),0,1)
      lineCol.copy(COL_DARK).lerp(COL_WHITE,whiteAmt)

      // Accent color: blue on white bg, yellow on blue/dark bg
      // Threshold at midpoint between BG_BLUE_START and BG_BLUE_MID: below → #0C68EB, above → #FFD700
      const accentIsBlue=scroll<(BG_BLUE_START+BG_BLUE_MID)/2
      if(accentIsBlue!==prevAccentIsBlue){
        prevAccentIsBlue=accentIsBlue
        const hexColor=accentIsBlue?'#0C68EB':'#FFC522'
        const ac=accentIsBlue?ACCENT_BLUE:ACCENT_YELLOW
        // Arc lines, dots, markers, halos — material.color only (no canvas)
        arc1Line.material.color.copy(ac); arc2Line.material.color.copy(ac)
        arc1Dot.material.color.copy(ac);  arc2Dot.material.color.copy(ac)
        mParis.material.color.copy(ac);   mAbidjan.material.color.copy(ac)
        mNairobi.material.color.copy(ac); mLagos.material.color.copy(ac)
        for(const{line,dot,halo,marker} of arc3Data){
          line.material.color.copy(ac); dot.material.color.copy(ac)
          halo.material.color.copy(ac); marker.material.color.copy(ac)
        }
        // Sprite labels — regenerate canvas texture with new color
        for(const spr of allLabels) regenSprite(spr,hexColor)
      }

      // ── Advance s5LitCount before country loop uses it ────────────────────
      if(b5>0.01){
        if(s5StartTime<0) s5StartTime=elapsed
        const newLit=Math.min(Math.floor((elapsed-s5StartTime)/0.12),SUPPORTED.length)
        if(newLit>s5LitCount&&dataReady){
          for(let i=s5LitCount;i<newLit;i++) if(s5Data[i]) s5Data[i].activatedAt=elapsed
          s5LitCount=newLit
        }
        // Once all countries are lit, record when the last one enters Phase 3 (600ms after its activation)
        if(s5LitCount===SUPPORTED.length&&s5AllLitAt<0&&dataReady&&s5Data.length>0){
          const lastAt=s5Data.reduce((mx,sd)=>sd?Math.max(mx,sd.activatedAt):mx,-Infinity)
          s5AllLitAt=lastAt+0.6
        }
      } else {
        s5StartTime=-1; s5LitCount=0; s5AllLitAt=-1
      }

      // Build s5 lit ID set
      const s5LitIds=new Set()
      if(b5>0.01&&dataReady)
        for(let i=0;i<s5LitCount;i++) if(s5Data[i]) s5LitIds.add(s5Data[i].entry.id)

      // ── Country opacity + color per frame ─────────────────────────────────
      if(dataReady){
        for(const c of countries){
          _tmp.copy(c.normal).applyQuaternion(globeGroup.quaternion)
          const backMult=_tmp.z>0?1.0:0.4
          const bordBackMult=c.isAfrica?(_tmp.z>0?1.0:0.5):backMult

          // fillBase/fillCol: only used for non-Africa Lambert meshes
          let fillBase=0.04,bordBase=0.08
          const baseFillCol=whiteAmt<0.5?COL_OTHER_LIGHT:COL_WHITE
          let fillCol=baseFillCol,bordCol=lineCol

          let s5BorderAlpha=null, s5FillAlpha=null
          if(b5>0.01){
            if(s5LitIds.has(c.id)){
              const sd=s5DataMap[c.id]
              if(sd){
                const age=elapsed-sd.activatedAt
                let bAlpha, fAlpha
                if(age<0.15){
                  // Phase 1 — flash: instant on, no easing
                  bAlpha=1.0; fAlpha=0.35
                } else if(age<0.6){
                  // Phase 2 — settle with ease-out cubic
                  const t=(age-0.15)/0.45
                  const eased=1-Math.pow(1-t,3)
                  bAlpha=1.0-eased*0.15
                  fAlpha=0.35-eased*0.20
                } else {
                  // Phase 3 — held permanently
                  bAlpha=0.85; fAlpha=0.15
                }
                // Final collective pulse — all countries fire simultaneously once
                if(s5AllLitAt>0){
                  const pa=elapsed-s5AllLitAt
                  if(pa>=0&&pa<=0.4){
                    const pf=Math.sin(pa/0.4*Math.PI)
                    bAlpha=Math.min(1.0,bAlpha+pf*(1.0-bAlpha))
                  }
                }
                s5BorderAlpha=bAlpha; s5FillAlpha=fAlpha
                bordBase=bAlpha; fillBase=fAlpha
                bordCol=COL_WHITE
                _fillCol.set(0xFFD700); fillCol=_fillCol
              }
            } else {
              // Unlit — stark dark contrast, lights-off look
              bordBase=0.08; fillBase=0
            }
          } else if(b4>0.01){
            if(c.isAfrica){ bordBase=0.75 }
            else{ fillBase=0.04; bordBase=0.05 }
          } else {
            if(c.isAfrica){
              bordBase=0.75
            } else if(b3>0.01){
              // S3: all non-Africa — explicit values
              fillBase=0.06; bordBase=0.25
            } else if(c.isEurope){
              // S1: Europe fill rises with b1
              if(b1>0) fillBase=Math.max(fillBase,lerp(0.04,0.45,b1))
              bordBase=fillBase
            }
            // S0/S2 non-Africa non-Europe: 0.04 default
          }

          // On blue/dark bg: no fill (lines only), calibrate border opacities to spec
          // State 5 manages its own values — skip this block to preserve the dramatic contrast
          if(whiteAmt>0&&!(b5>0.01)){
            fillBase=0
            // Africa: 0.65 on blue → 0.70 on dark; others: 0.12 → 0.15
            if(c.isAfrica){ bordBase=lerp(bordBase,lerp(0.65,0.70,darkAmt),whiteAmt) }
            else           { bordBase=lerp(bordBase,lerp(0.12,0.15,darkAmt),whiteAmt) }
          }

          const fillOp=clamp(fillBase*backMult,0,1)
          const bordOp=clamp(bordBase*bordBackMult,0,1)

          // Africa: radial gradient shader controlled by uOpacity (light bg only)
          // Supported African countries get a yellow tint (#FFC522) on dark/blue bg
          // Non-Africa: Lambert controlled by color + opacity
          if(c.isAfrica){
            const shaderOp=clamp(1-whiteAmt,0,1)
            let tintOp=0
            if(b5>0.01&&c.isSupported){
              // Drive tint from three-phase fill alpha (s5FillAlpha=0 for unlit, 0.15–0.35 for lit)
              tintOp=s5FillAlpha!==null?s5FillAlpha*20:0
            }
            for(const m of c.meshes){
              m.material.uniforms.uOpacity.value=shaderOp
              m.material.uniforms.uTintOpacity.value=tintOp
            }
            // Animate per-country border line for S5 reveal
            const csd=s5DataMap[c.id]
            if(csd&&csd.countryBorder){
              csd.countryBorder.material.opacity=
                (b5>0.01&&s5BorderAlpha!==null)?s5BorderAlpha*bordBackMult:0
            }
          } else {
            for(const m of c.meshes){m.material.color.copy(fillCol);m.material.opacity=fillOp}
          }
          if(c.borders){c.borders.material.color.copy(bordCol);c.borders.material.opacity=bordOp}
          // Outer border: visible only on front hemisphere — creates double-stroke depth effect
          if(c.bordersOuter){
            const dotFront=clamp(_tmp.z,0,1)
            c.bordersOuter.material.color.copy(bordCol)
            c.bordersOuter.material.opacity=bordOp*lerp(0.0,0.35,dotFront)
          }
        }
      }

      // Effect B — Graticule shimmer: flat 0.08 when reduced-motion or State 5; rolling sine wave otherwise
      const _darkBgScale=lerp(1.0,1.4,whiteAmt)
      const _hoverAdd=hoverBoost*0.10
      if(reduceMotion||b5>0.01){
        for(const{line} of gratLatLines){line.material.color.copy(lineCol);line.material.opacity=0.08*effectsFade}
        for(const{line} of gratLonLines){line.material.color.copy(lineCol);line.material.opacity=0.08*effectsFade}
      } else {
        for(const{line,lat} of gratLatLines){
          const wave=0.5+0.5*Math.sin(elapsed*0.6-lat*0.18)
          const alpha=clamp((0.06+wave*0.22)*_darkBgScale+_hoverAdd,0,1)
          line.material.color.copy(lineCol)
          line.material.opacity=alpha*effectsFade
        }
        for(const{line,lon} of gratLonLines){
          const wave=0.5+0.5*Math.sin(elapsed*0.6+lon*0.09)
          const alpha=clamp((0.05+wave*0.18)*_darkBgScale+_hoverAdd,0,1)
          line.material.color.copy(lineCol)
          line.material.opacity=alpha*effectsFade
        }
      }

      // Africa border hierarchy: coast 0.92→0.75 (light→dark/blue bg); flat 0.08 in State 5 for dark-room effect
      if(africaCoastLine){
        africaCoastLine.material.color.copy(lineCol)
        africaCoastLine.material.opacity=b5>0.01?0.08:lerp(0.92,0.75,whiteAmt)
      }
      if(africaInternalLine){
        africaInternalLine.material.color.copy(lineCol)
        africaInternalLine.material.opacity=b5>0.01?0.04:lerp(0.30,0.20,whiteAmt)
      }

      // Fresnel rim: strong on light bg, whisper-thin on blue/dark (0.06→0.08)
      rimMat.uniforms.uFresnelStrength.value=lerp(0.12,lerp(0.06,0.08,darkAmt),whiteAmt)

      // Face factor for city/marker visibility
      const faceFactor=n=>{
        _tmp.copy(n).applyQuaternion(globeGroup.quaternion)
        return clamp(_tmp.z*4,0,1)
      }

      // ── Arc 1 (Paris → Abidjan) — fully cleared once State 2 begins ──────
      const b1v=scroll>=S2S?0:b1
      arc1Line.material.opacity=b1v
      if(b1v>0.01){
        if(!reduceMotion){
          const t=(elapsed%2.5)/2.5
          arc1Dot.position.copy(arc1Crv.getPoint(clamp(t,0,1)))
          arc1Dot.scale.setScalar(1+(t>0.88?Math.sin((t-0.88)/0.12*Math.PI)*0.8:0))
          arc1Dot.material.opacity=b1v
        } else { arc1Dot.material.opacity=0 }
        mParis.lookAt(camera.position); mAbidjan.lookAt(camera.position)
      } else {arc1Dot.material.opacity=0;mParis.material.opacity=0;mAbidjan.material.opacity=0;lParis.material.opacity=0;lAbidjan.material.opacity=0}
      if(b1v>0){
        const pF=faceFactor(PARIS_N), aF=faceFactor(ABIDJAN_N)
        mParis.material.opacity=b1v*pF; mAbidjan.material.opacity=b1v*aF
        lParis.material.opacity=b1v*(pF>0.5?1:0); lAbidjan.material.opacity=b1v*(aF>0.5?1:0)
      }

      // ── Arc 2 (Bamako → Kinshasa) — fully cleared once State 3 begins ────
      const b2v=scroll>=S3S?0:b2
      arc2Line.material.opacity=b2v
      if(b2v>0.01){
        if(!reduceMotion){
          const t=(elapsed%2.5)/2.5
          arc2Dot.position.copy(arc2Crv.getPoint(clamp(t,0,1)))
          arc2Dot.scale.setScalar(1+(t>0.88?Math.sin((t-0.88)/0.12*Math.PI)*0.8:0))
          arc2Dot.material.opacity=b2v
        } else { arc2Dot.material.opacity=0 }
        mNairobi.lookAt(camera.position); mLagos.lookAt(camera.position)
      } else {arc2Dot.material.opacity=0;mNairobi.material.opacity=0;mLagos.material.opacity=0;lNairobi.material.opacity=0;lLagos.material.opacity=0}
      if(b2v>0){
        const nF=faceFactor(NAIROBI_N), kF=faceFactor(LAGOS_N)
        mNairobi.material.opacity=b2v*nF; mLagos.material.opacity=b2v*kF
        lNairobi.material.opacity=b2v*(nF>0.5?1:0); lLagos.material.opacity=b2v*(kF>0.5?1:0)
      }

      // ── State 3 arc color: evaluated once at activation, not inherited ──────
      const b3Active=b3>0.01
      if(b3Active&&!prevB3Active){
        const arc3Blue=scroll<(BG_BLUE_START+BG_BLUE_MID)/2
        if(import.meta.env.DEV) console.log('[State 3 activated] scrollProgress:',scroll.toFixed(4),'→ accent:',arc3Blue?'#0C68EB':'#FFD700')
        const arc3Accent=arc3Blue?ACCENT_BLUE:ACCENT_YELLOW
        for(const{line,dot,halo,marker} of arc3Data){
          line.material.color.copy(arc3Accent)
          dot.material.color.copy(arc3Accent)
          halo.material.color.copy(arc3Accent)
          marker.material.color.copy(arc3Accent)
        }
      }
      prevB3Active=b3Active

      // ── Arcs 3 (5 simultaneous) ───────────────────────────────────────────
      for(const{crv,line,dot,halo,marker,lbl,offset,fromNormal} of arc3Data){
        line.material.opacity=b3*0.85
        if(b3>0.01&&!reduceMotion){
          const t=((elapsed-offset)%3.5)/3.5
          const pos=crv.getPoint(clamp(t,0,1))
          dot.position.copy(pos); halo.position.copy(pos)
          const pulse=t>0.9143?Math.sin((t-0.9143)/0.0857*Math.PI)*0.8:0
          dot.scale.setScalar(1+pulse); halo.scale.setScalar(1+pulse*0.5)
          dot.material.opacity=b3; halo.material.opacity=b3*0.65
          marker.lookAt(camera.position)
        } else {dot.material.opacity=0;halo.material.opacity=0}
        const ff=faceFactor(fromNormal)
        marker.material.opacity=b3*ff; lbl.material.opacity=b3*(ff>0.5?1:0)
      }

      // ── State 4 dense arc pool ────────────────────────────────────────────
      const s4FadeOut=s4ArcFadeStart>0?Math.max(0,1-(elapsed-s4ArcFadeStart)/0.5):1.0
      const arcGlobalAlpha=b4*s4FadeOut
      // Halo glow: only visible on blue bg (whiteAmt=1, darkAmt≈0)
      const haloAmt=whiteAmt*(1-darkAmt)
      if(arcGlobalAlpha<0.001||reduceMotion){
        for(const slot of s4Pool){
          slot.active=false; slot.line.material.opacity=0; slot.dot.material.opacity=0; slot.halo.material.opacity=0
        }
      } else {
        let activeCount=0
        for(const slot of s4Pool) if(slot.active) activeCount++
        if(activeCount<40){
          for(const slot of s4Pool){
            if(!slot.active&&activeCount<50){ spawnArc(slot,elapsed); activeCount++ }
          }
        }
        for(const slot of s4Pool){
          if(!slot.active){ slot.line.material.opacity=0; slot.dot.material.opacity=0; slot.halo.material.opacity=0; continue }
          const age=elapsed-slot.startTime
          const tFrac=age/slot.duration
          let alpha=1.0
          if(tFrac>=1.0){
            alpha=Math.max(0,1-(age-slot.duration)/0.15)
            if(alpha<=0){ slot.active=false; slot.line.material.opacity=0; slot.dot.material.opacity=0; slot.halo.material.opacity=0; continue }
          }
          slot.line.material.opacity=0.35*alpha*arcGlobalAlpha
          const t=Math.min(tFrac,1.0)
          const fi=t*29; const ii=Math.floor(fi)
          _dotPos.lerpVectors(slot.pts[ii],slot.pts[Math.min(ii+1,29)],fi-ii)
          slot.dot.position.copy(_dotPos)
          slot.dot.material.opacity=0.85*alpha*arcGlobalAlpha
          slot.halo.position.copy(_dotPos)
          slot.halo.material.opacity=0.20*alpha*arcGlobalAlpha*haloAmt
        }
      }

      // ── State 5: hover-only label sprites ────────────────────────────────
      if(b5>0.01&&dataReady){
        raycaster.setFromCamera(mouse,camera)
        const hits=raycaster.intersectObjects(s5Meshes)
        hoveredId=hits.length>0?(meshToId.get(hits[0].object)??null):null
      } else {
        hoveredId=null
      }
      if(dataReady){
        for(const sd of s5Data){
          if(!sd) continue
          const lbl=sd.labelSprite
          if(b5>0.01&&sd.entry.id===hoveredId){
            lbl.material.opacity=Math.min(lbl.material.opacity+5*dt,1.0)
          } else {
            lbl.material.opacity=Math.max(lbl.material.opacity-5*dt,0)
          }
        }
      }

      renderer.render(scene,camera)
      if(!_firstRenderMarked){
        _firstRenderMarked=true
        performance.mark('globe-first-render')
        performance.measure('globe-total-init','topo-fetch-start','globe-first-render')
      }

      // ── 2D overlay: Effect A (rim pulse) + Effect C (coastline trace) ────────
      overlayCtx.clearRect(0,0,overlayCanvas.width,overlayCanvas.height)
      const _W=overlayCanvas.width, _H=overlayCanvas.height

      // Project globe center to screen
      globeGroup.getWorldPosition(_oc)
      _op.copy(_oc).project(camera)
      const _cx=(_op.x*0.5+0.5)*_W
      const _cy=(1-(_op.y*0.5+0.5))*_H
      // Perspective-correct screen radius: sphere radius=scale, camera at distance dist
      const _dist=camera.position.distanceTo(_oc)
      const _screenR=(globeGroup.scale.x/(2*_dist*Math.tan(camera.fov*Math.PI/360)))*_H

      // ── State 0 idle animation: particle field + dual orbital rings ─────────
      // Fades from full opacity at scroll=0.0 to transparent at scroll=0.15
      const _idleFade=reduceMotion?0:clamp(1-scroll/0.15,0,1)*effectsFade
      if(_idleFade>0.001){
        // Particle field — 80 dots drifting along latitude lines
        for(const p of idleParticles){
          const phi=p.lat*Math.PI/180
          const lam=p.a0+p.speed*elapsed
          const px=_cx+_screenR*Math.cos(phi)*Math.sin(lam)
          const py=_cy-_screenR*Math.sin(phi)
          const pz=_screenR*Math.cos(phi)*Math.cos(lam)
          if(pz>0){
            const depthAlpha=0.3+0.7*(pz/_screenR)
            overlayCtx.beginPath()
            overlayCtx.arc(px,py,p.r,0,Math.PI*2)
            overlayCtx.fillStyle=`rgba(30,28,24,${(0.28*depthAlpha*_idleFade).toFixed(3)})`
            overlayCtx.fill()
          }
        }
        // Ring 1: tilt +20°, 0.4 rad/s, opacity 0.16, 0.6px
        drawOrbitalRing(overlayCtx,_cx,_cy,_screenR,elapsed,0.4,20,0.16*_idleFade,0.6)
        // Ring 2: tilt -35°, 0.28 rad/s, opacity 0.10, 0.5px
        drawOrbitalRing(overlayCtx,_cx,_cy,_screenR,elapsed,0.28,-35,0.10*_idleFade,0.5)
      }

      // Effect A — Rim pulse, bg-aware
      // Blend factors: light bg (0.0–0.45) → blue bg (0.45–0.78) → dark bg (0.78–1.0)
      const _toBlue=clamp((scroll-0.45)/0.05,0,1)
      const _toDark=clamp((scroll-0.78)/0.05,0,1)
      const _breathe=0.5+0.5*Math.sin(elapsed*0.75)

      // Rim: full on light, reduced on blue/dark, hover boost capped at +0.04 on blue/dark
      const _rimLight=0.02+_breathe*0.05+hoverBoost*0.06
      const _rimBlue =0.02+_breathe*0.04+hoverBoost*0.04
      const _rimDark =0.02+_breathe*0.05+hoverBoost*0.04
      // Effect A — Rim pulse: disabled when motion reduced or State 5; flat 0.05 when reduced
      const _rimAlpha=(reduceMotion?0.05:b5>0.01?0:clamp(lerp(lerp(_rimLight,_rimBlue,_toBlue),_rimDark,_toDark),0,1))*effectsFade

      // Center glow: only on light bg — disabled when motion reduced, on blue, dark, and State 5
      const _centerGlow=(reduceMotion||b5>0.01)?0:(clamp((_breathe*0.012+hoverBoost*0.02)*(1-_toBlue),0,1))*effectsFade

      overlayCtx.save()
      overlayCtx.beginPath()
      overlayCtx.arc(_cx,_cy,_screenR,0,Math.PI*2)
      overlayCtx.clip()

      // Rim gradient peaks at ~90% of sphere radius and fades to transparent at the edge
      const _rimGrad=overlayCtx.createRadialGradient(_cx,_cy,_screenR*0.6,_cx,_cy,_screenR)
      _rimGrad.addColorStop(0,'rgba(255,255,255,0)')
      _rimGrad.addColorStop(0.75,`rgba(255,255,255,${_rimAlpha.toFixed(3)})`)
      _rimGrad.addColorStop(1,'rgba(255,255,255,0)')
      overlayCtx.fillStyle=_rimGrad
      overlayCtx.fillRect(0,0,_W,_H)

      if(_centerGlow>0.001){
        const _glowGrad=overlayCtx.createRadialGradient(_cx,_cy,0,_cx,_cy,_screenR)
        _glowGrad.addColorStop(0,`rgba(255,255,255,${_centerGlow.toFixed(3)})`)
        _glowGrad.addColorStop(1,'rgba(255,255,255,0)')
        overlayCtx.fillStyle=_glowGrad
        overlayCtx.fillRect(0,0,_W,_H)
      }

      overlayCtx.restore()

    }
    renderer.setAnimationLoop(animate)

    // Pause render loop when tab is hidden — resumes on visibility
    const onVisibilityChange=()=>{
      if(document.hidden){
        renderer.setAnimationLoop(null)
      } else {
        renderer.setAnimationLoop(animate)
      }
    }
    document.addEventListener('visibilitychange',onVisibilityChange)

    // ── Mouse tracking for S5 hover raycasting (window-level; globe has pointer-events:none) ──
    const onWindowMouseMove=(e)=>{
      const rect=cv.getBoundingClientRect()
      mouse.x=((e.clientX-rect.left)/rect.width)*2-1
      mouse.y=-((e.clientY-rect.top)/rect.height)*2+1
    }
    window.addEventListener('mousemove',onWindowMouseMove)

    const onResize=()=>{
      const w=container.clientWidth,h=container.clientHeight
      camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h)
      overlayCanvas.width=w; overlayCanvas.height=h
    }
    window.addEventListener('resize',onResize)

    return()=>{
      _rmMQ.removeEventListener('change',_onRMChange)
      renderer.setAnimationLoop(null)
      document.removeEventListener('visibilitychange',onVisibilityChange)
      window.removeEventListener('scroll',onIntroScroll)
      window.removeEventListener('mousemove',onWindowMouseMove)
      window.removeEventListener('resize',onResize)

      // ── Dispose country meshes, borders, and per-country S5 borders ──────────
      for(const c of countries){
        for(const m of c.meshes){ m.geometry.dispose(); m.material.dispose() }
        if(c.borders){ c.borders.geometry.dispose(); c.borders.material.dispose() }
        if(c.bordersOuter){ c.bordersOuter.geometry.dispose(); c.bordersOuter.material.dispose() }
      }
      for(const sd of s5Data){
        if(!sd) continue
        if(sd.countryBorder){ sd.countryBorder.geometry.dispose(); sd.countryBorder.material.dispose() }
      }

      // ── Dispose Africa coastline / internal border LineSegments ──────────────
      if(africaCoastLine){ africaCoastLine.geometry.dispose(); africaCoastLine.material.dispose() }
      if(africaCoastBaseLine){ africaCoastBaseLine.geometry.dispose(); africaCoastBaseLine.material.dispose() }
      if(africaInternalLine){ africaInternalLine.geometry.dispose(); africaInternalLine.material.dispose() }

      // ── Dispose graticule lines ───────────────────────────────────────────────
      for(const{line} of gratLatLines){ line.geometry.dispose(); line.material.dispose() }
      for(const{line} of gratLonLines){ line.geometry.dispose(); line.material.dispose() }

      // ── Dispose S4 arc pool ───────────────────────────────────────────────────
      for(const slot of s4Pool){
        slot.line.geometry.dispose(); slot.line.material.dispose()
        slot.dot.geometry.dispose();  slot.dot.material.dispose()
        slot.halo.geometry.dispose(); slot.halo.material.dispose()
      }

      // ── Dispose Arc 1 ─────────────────────────────────────────────────────────
      arc1Line.geometry.dispose(); arc1Line.material.dispose()
      arc1Dot.geometry.dispose();  arc1Dot.material.dispose()
      mParis.geometry.dispose();   mParis.material.dispose()
      mAbidjan.geometry.dispose(); mAbidjan.material.dispose()

      // ── Dispose Arc 2 ─────────────────────────────────────────────────────────
      arc2Line.geometry.dispose(); arc2Line.material.dispose()
      arc2Dot.geometry.dispose();  arc2Dot.material.dispose()
      mNairobi.geometry.dispose(); mNairobi.material.dispose()
      mLagos.geometry.dispose();   mLagos.material.dispose()

      // ── Dispose Arc 3 ─────────────────────────────────────────────────────────
      for(const{line,dot,halo,marker} of arc3Data){
        line.geometry.dispose();   line.material.dispose()
        dot.geometry.dispose();    dot.material.dispose()
        halo.geometry.dispose();   halo.material.dispose()
        marker.geometry.dispose(); marker.material.dispose()
      }

      // ── Dispose label sprites (CanvasTexture + SpriteMaterial) ───────────────
      for(const spr of allLabels){
        if(spr.material.map) spr.material.map.dispose()
        spr.material.dispose()
      }

      // ── Dispose Fresnel rim ───────────────────────────────────────────────────
      rimMesh.geometry.dispose(); rimMat.dispose()

      scene.clear()
      renderer.dispose()
      if(renderer.domElement.parentNode===container) container.removeChild(renderer.domElement)
      if(overlayCanvas.parentNode===container) container.removeChild(overlayCanvas)
    }
  },[scrollProgressRef])

  return (
    <div
      className="fixed top-0 right-0 w-[50vw] h-screen mr-16"
      style={{zIndex:0,pointerEvents:'none'}}
      aria-hidden="true"
    >
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
})

export default GlobeCanvas
