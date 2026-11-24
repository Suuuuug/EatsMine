"""Build detailed maps from pinned upstream geometry. pip install shapely pyproj; python apps/web/scripts/maps/rebuild_maps.py"""
import json, hashlib, urllib.request, sys, re
from pathlib import Path
from shapely.geometry import Polygon, MultiPolygon, mapping
from shapely.ops import transform, unary_union
from shapely import make_valid
from pyproj import Transformer
from html import escape
# apps/web/scripts/maps/rebuild_maps.py 기준. 원본 blob은 scripts/maps/source/base.js에 받는다.
ROOT=Path(__file__).resolve().parents[2]; MAP=ROOT/'public/images/maps'; SRC=Path(__file__).resolve().parent/'source/base.js'
SHA='835066141869ef82219533d246833a40e187bd94'
URL='https://api.github.com/repos/worlyung/krmap/git/blobs/'+SHA
if not SRC.exists():
 import base64
 req=urllib.request.Request(URL,headers={'User-Agent':'EatsMine-map-builder','Accept':'application/vnd.github+json'})
 b=json.load(urllib.request.urlopen(req,timeout=60)); raw=base64.b64decode(b['content']); SRC.write_bytes(raw)
raw=SRC.read_bytes(); assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==SHA,'Source hash mismatch'
s=raw.decode(); data=json.loads(s[s.index('{'):s.rindex('}')+1]); assert data['meta']['version']=='20261001'
unit=data['meta']['unit']; x0,y0=data['meta']['origin']; t=Transformer.from_crs(5179,4326,always_xy=True)
def decode(r):
 x=y=0;out=[]
 for i in range(0,len(r),2):
  x+=r[i];y+=r[i+1];out.append((x,y))
 return out
def polys(g):
 if g.geom_type=='Polygon':return [g]
 return [p for x in getattr(g,'geoms',[]) for p in polys(x)]
def geom(f):
 ps=[]
 for p in f['g']:
  ps.extend(polys(make_valid(Polygon(decode(p[0]),[decode(r) for r in p[1:]]))))
 return unary_union(ps)
def svgpath(g):
 return ' '.join('M'+'L'.join(f'{x:g},{y:g}' for x,y in ring.coords)+'Z' for p in polys(g) for ring in [p.exterior,*p.interiors])
def dump(p,o):p.write_text(json.dumps(o,ensure_ascii=False,separators=(',',':')))
meta=json.loads((MAP/'region-codes.json').read_text()); bycode={p['code']:p for p in meta['provinces']}; out=MAP/'geojson'; out.mkdir(exist_ok=True);(out/'regions').mkdir(exist_ok=True)
rows={c:(f,geom(f)) for lv in ('sido','si') for c,f in data[lv].items()}; prov=list(data['sido']); leaf=list(data['si']); assert len(prov)==16 and len(leaf)==230

def svg(codes, target):
 gs=[rows[c][1] for c in codes]; x,y,x1,y1=unary_union(gs).bounds; pad=max(x1-x,y1-y)*.035; vb=[x-pad,y-pad,x1-x+2*pad,y1-y+2*pad]
 paths=''.join(f'<path id="r-{c}" data-region-code="{c}" data-name="{escape(rows[c][0]["nm"])}" d="{svgpath(rows[c][1])}" fill="#E3E8D4" stroke="#7C8A70" stroke-width="1.2" vector-effect="non-scaling-stroke" fill-rule="evenodd"><title>{escape(rows[c][0]["nm"])}</title></path>' for c in codes)
 target.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{" ".join(map(str,vb))}"><desc>SGIS 2026-10-01 / krmap / admdongkor</desc>{paths}</svg>');return vb

def fc(codes):
 def f(c):
  row,g=rows[c];g=transform(lambda x,y,z=None:t.transform(x0+x*unit,y0-y*unit),g)
  # RFC 7946 exterior CCW
  from shapely.geometry.polygon import orient
  pp=[orient(p,sign=1) for p in polys(g)];g=pp[0] if len(pp)==1 else MultiPolygon(pp)
  return {'type':'Feature','id':c,'properties':{'code':c,'name':row['nm'],'parentCode':row['sido'] if len(c)==5 else None,'sourceDate':'2026-10-01','geometryQuality':'source-resolution'},'geometry':mapping(g)}
 return {'type':'FeatureCollection','features':[f(c) for c in codes]}
svg(prov,MAP/'korea.svg');svg(leaf,MAP/'korea-territories.svg');dump(out/'sido.geojson',fc(prov));dump(out/'territories.geojson',fc(leaf))
for c in prov:
 cs=[k for k in leaf if data['si'][k]['sido']==c]; bycode[c]['viewBox']=svg(cs,MAP/bycode[c]['svg']);dump(out/'regions'/f'{c}.geojson',fc(cs))
meta['geometryQuality']='source-resolution';meta['territories']=[{'code':c,'name':data['si'][c]['nm'],'parentCode':data['si'][c]['sido'],'labelPoint':list(t.transform(x0+data['si'][c]['lp'][0]*unit,y0-data['si'][c]['lp'][1]*unit)),'memberSggCodes':data['si'][c].get('gu',[c])} for c in leaf];dump(MAP/'region-codes.json',meta)
dump(MAP/'sgg-to-territory.json',{c:f['si'] for c,f in data['sgg'].items()});print('Built detailed 16 provinces / 230 territories. Source:',SHA)
