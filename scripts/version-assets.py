from pathlib import Path
import hashlib,re
root=Path(__file__).resolve().parents[1]/'dist'
p=root/'index.html';s=p.read_text()
def replace(m):
 prefix,name,quote=m.groups();asset=root/name
 return prefix+name+'?v='+hashlib.sha256(asset.read_bytes()).hexdigest()[:12]+quote
s=re.sub(r'((?:src|href)=\")((?:[a-z-]+)\.(?:js|css))(?:\?v=[a-f0-9]+)?(\")',replace,s)
p.write_text(s)
