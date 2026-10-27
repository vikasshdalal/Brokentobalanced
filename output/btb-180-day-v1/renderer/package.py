"""Produce a relative-path archive and inventory. No dependencies or network."""
import hashlib,json,sys,zipfile
from pathlib import Path
root=Path(sys.argv[1]).resolve()
excluded={'.DS_Store','archive-integrity.json','file-inventory.json'}
forbidden={'.ttf','.otf','.woff','.woff2','.ttc','.key','.pem'}
files=sorted(p for p in root.rglob('*') if p.is_file() and p.name not in excluded)
assert not any(p.suffix.lower() in forbidden for p in files),'Forbidden font/secret binary'
assert not any(set(p.relative_to(root).parts)&{'node_modules','.git','.cache','browser-profile','__pycache__'} for p in files)
inventory=[{'path':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]
(root/'file-inventory.json').write_text(json.dumps({'files':inventory,'count':len(inventory)},indent=2)+'\n')
files.append(root/'file-inventory.json')
archive=root.parent/(root.name+'-review.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files:
  rel=p.relative_to(root).as_posix()
  info=zipfile.ZipInfo(root.name+'/'+rel,date_time=(2026,10,27,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16
  z.writestr(info,p.read_bytes())
with zipfile.ZipFile(archive) as z:
 bad=z.testzip();assert bad is None,bad
 names=z.namelist();assert all(not n.startswith('/') and '..' not in Path(n).parts for n in names)
 result={'archive':archive.name,'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'members':len(names),'zip_crc':'PASS','relative_paths':'PASS','font_binaries':0,'private_source_files':0}
(root.parent/(root.name+'-archive-integrity.json')).write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
