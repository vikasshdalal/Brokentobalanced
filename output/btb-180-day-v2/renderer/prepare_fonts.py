"""Fetch only pinned open-licensed font dependencies to temporary runtime storage.

No project input is transmitted. No font binary is written inside deliverables.
Existing matching runtime files are reused without a network request.
"""
from pathlib import Path
import hashlib,json,os,tempfile,urllib.request
root=Path(__file__).resolve().parent
config=json.loads((root/'runtime-config.json').read_text())
recorded=Path(config['fonts']['headings']['path']).parent
default=recorded if recorded.exists() else Path(tempfile.gettempdir())/'btb-font-runtime-v1'
target=Path(os.environ.get('BTB_FONT_RUNTIME_DIR',str(default))).resolve()
assert not target.is_relative_to(root.parent),'Font binaries must stay outside deliverables'
target.mkdir(parents=True,exist_ok=True)
for key,record in config['fonts'].items():
 path=target/Path(record['path']).name
 if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest()!=record['sha256']:
  with urllib.request.urlopen(record['url'],timeout=60) as response:
   data=response.read()
  assert hashlib.sha256(data).hexdigest()==record['sha256'],'Font checksum mismatch'
  path.write_bytes(data)
 print(key+': '+str(path))
print('Set BTB_HEADING_FONT / BTB_BODY_FONT to these paths when different from runtime-config.json.')
