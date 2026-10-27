#!/usr/bin/env python3
"""Independent, standard-library-only canonical input audit. No input writes/network."""
import argparse
from collections import Counter
from datetime import date, timedelta
from hashlib import sha256
import json
from pathlib import Path
import re


def digest(data):
    return sha256(data).hexdigest()


def audit(root):
    root = Path(root).resolve()
    source = root / 'BTB_180_Day_Content.json'
    raw = source.read_bytes()
    content = json.loads(raw)
    # Parse and traverse all metadata and publishable fields, without executing any values.
    def traverse(value):
        if isinstance(value, dict):
            for key, entry in value.items():
                yield key
                yield from traverse(entry)
        elif isinstance(value, list):
            for entry in value:
                yield from traverse(entry)
        else:
            yield value
    traversed_values = sum(1 for _ in traverse(content))
    errors = []
    checks = []
    def check(name, success, detail=None):
        item = {'check': name, 'passed': bool(success)}
        if detail is not None:
            item['detail'] = detail
        checks.append(item)
        if not success:
            errors.append(item)
    check('schema_version', content.get('schema_version') == '1.0')
    check('brand', content.get('brand') == 'Broken to Balanced')
    check('root_fields', all(k in content for k in ['schema_version', 'brand', 'research_cutoff', 'window_start', 'window_end', 'purpose', 'pillars', 'posts']))
    posts = content['posts']
    check('post_count', len(posts) == 180, len(posts))
    check('contiguous_ids', [p.get('id') for p in posts] == [f'BTB-{n:03d}' for n in range(1,181)])
    check('unique_ids', len(set(p.get('id') for p in posts)) == len(posts))
    check('contiguous_days', [p.get('day') for p in posts] == list(range(1,181)))
    check('dates', [p.get('planned_date') for p in posts] == [(date(2026,10,28)+timedelta(days=n)).isoformat() for n in range(180)])
    check('window', content['window_start'] == '2026-10-28' and content['window_end'] == '2027-04-25')
    counts = dict(Counter(p.get('pillar_id') for p in posts))
    check('pillar_counts', counts == {'P1':36, 'P2':36, 'P3':30, 'P4':30, 'P5':36, 'P6':12}, counts)
    check('layout_families', set(p.get('layout') for p in posts) == {'editorial','contrast','script','checklist','letter'})
    founders = [p['id'] for p in posts if p.get('founder_attestation_required') is True]
    expected_founders = ['BTB-014','BTB-030','BTB-044','BTB-060','BTB-074','BTB-090','BTB-104','BTB-120','BTB-134','BTB-150','BTB-164','BTB-180']
    check('founder_attestation_ids', founders == expected_founders, founders)
    required_strings = ['id','planned_date','timezone','date_status','phase','pillar_id','pillar','existing_parent_pillar','series','layout','visual_brief','primary_cta','intended_signal','hook','caption','caption_ready_to_copy','voice','provenance_scope','claim_class','validation_status','publish_status','copy_sha256']
    required_lists = ['slides','hashtags','provenance_ids','safety_boundaries','revalidate_before_publication']
    post_results = []
    all_texts = []
    all_captions = []
    chars = set()
    pattern_hits = []
    # These screens identify obvious placeholders/private-looking strings, not unknown private identities.
    disallowed = {'placeholder': r'\b(?:TODO|TBD|LOREM IPSUM|INSERT HERE)\b',
                  'email': r'\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b',
                  'phone': r'(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b',
                  'case_number': r'\b(?:case|docket|court file)\s*(?:number|no\.?|#)\s*[A-Z0-9-]{4,}',
                  'currency_amount': r'[$€£]\s*\d',
                  'replacement_character': '\ufffd',
                  'control_character': r'[\x00-\x08\x0b\x0c\x0e-\x1f]',
                  'html_markup': r'<\s*/?\s*[A-Za-z][^>]*>',
                  'literal_entity': r'&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);'}
    for p in posts:
        p_errors = []
        def pcheck(name, ok):
            if not ok:
                p_errors.append(name)
        pcheck('required_string_fields', all(isinstance(p.get(k),str) and p[k].strip() for k in required_strings))
        pcheck('required_list_fields', all(isinstance(p.get(k),list) and p[k] for k in required_lists))
        pcheck('day_type', isinstance(p.get('day'),int) and not isinstance(p.get('day'),bool))
        pcheck('attestation_boolean', isinstance(p.get('founder_attestation_required'),bool))
        pcheck('timezone', p['timezone'] == 'America/Toronto')
        pcheck('six_slides', len(p['slides']) == 6)
        pcheck('number_order', [s.get('number') for s in p['slides']] == list(range(1,7)))
        pcheck('hash_format', bool(re.fullmatch(r'[0-9a-f]{64}',p['copy_sha256'])))
        actual = digest(('\n'.join(s['text'] for s in p['slides'])+'\n'+p['caption']).encode('utf-8'))
        pcheck('copy_sha256', actual == p['copy_sha256'])
        pcheck('hook_equals_cover', p['hook'] == p['slides'][0]['text'])
        pcheck('caption_ready_to_copy', p['caption_ready_to_copy'] == p['caption']+'\n\n'+' '.join(p['hashtags']))
        pcheck('three_hashtags', len(p['hashtags']) == 3 and all(isinstance(h,str) and h.startswith('#') for h in p['hashtags']))
        pcheck('known_cta', p['primary_cta'] in {'save','share','follow'})
        # Exact CTA text is canonical; detect the requested primary action on supplied slide 6.
        cta_pattern = {'save':r'\bsave\b','share':r'\b(?:share|send)\b','follow':r'\bfollow\b'}[p['primary_cta']]
        pcheck('primary_cta_in_slide6', bool(re.search(cta_pattern,p['slides'][5]['text'],re.I)))
        pcheck('slide2_meaningful', len(p['slides'][1]['text'].split()) >= 5)
        pcheck('unpublished_draft', p['publish_status'] == 'DRAFT — unpublished; owner editorial approval required')
        pcheck('actual_performance_unknown', p['performance_actuals'] is None)
        pcheck('founder_flag_corresponds_to_P6', p['founder_attestation_required'] == (p['pillar_id']=='P6'))
        pcheck('max_slide_words_metadata', p['max_slide_words'] == max(len(s['text'].split()) for s in p['slides']))
        slide_results = []
        for s in p['slides']:
            valid = all(isinstance(s.get(k),str) and s[k].strip() for k in ['text','alt_text'])
            alt_exact = s['alt_text'] == f"Slide {s['number']} of 6. {s['text']}"
            slide_results.append({'number':s['number'], 'nonempty_text_and_alt':valid,'alt_text_exact_prefix_and_copy':alt_exact,'text_sha256':digest(s['text'].encode()),'words':len(s['text'].split())})
            pcheck(f'slide{s["number"]}_fields', valid and alt_exact)
            all_texts.append(s['text'])
        all_captions.append(p['caption'])
        for field, txt in [(f'slide{s["number"]}',s['text']) for s in p['slides']]+[('caption',p['caption']),('caption_ready_to_copy',p['caption_ready_to_copy'])]+[(f'alt{s["number"]}',s['alt_text']) for s in p['slides']]:
            chars.update(txt)
            for label, pattern in disallowed.items():
                if re.search(pattern,txt,re.I):
                    pattern_hits.append({'id':p['id'],'field':field,'screen':label})
        post_results.append({'id':p['id'],'planned_date':p['planned_date'],'copy_sha256_expected':p['copy_sha256'],'copy_sha256_actual':actual,'passed':not p_errors,'errors':p_errors,'slides':slide_results,'primary_cta':p['primary_cta'],'founder_attestation_required':p['founder_attestation_required'],'owner_approval_required':True})
    check('all_posts_schema_hash_metadata', all(p['passed'] for p in post_results), [{'id':p['id'],'errors':p['errors']} for p in post_results if not p['passed']])
    check('exact_slides_count', len(all_texts)==1080)
    check('nonempty_captions', len(all_captions)==180 and all(all_captions))
    check('unique_slide_texts', len(set(all_texts))==1080)
    check('unique_hooks', len(set(p['hook'] for p in posts))==180)
    check('unique_captions', len(set(all_captions))==180)
    check('limited_pattern_screen', not pattern_hits,pattern_hits)
    package_manifest = json.loads((root/'MANIFEST_SHA256.json').read_text())
    source_files = []
    for entry in package_manifest['files']:
        path = root/entry['name']
        # Manifest names must remain in sanitized package root.
        safe = path.parent == root and path.is_file()
        actual_hash = digest(path.read_bytes()) if safe else None
        actual_size = path.stat().st_size if safe else None
        source_files.append({'name':entry['name'],'passed':safe and actual_hash==entry['sha256'] and actual_size==entry['bytes'],'expected_sha256':entry['sha256'],'actual_sha256':actual_hash,'actual_bytes':actual_size})
    check('source_package_manifest', all(f['passed'] for f in source_files),len(source_files))
    word_count=sum(len(t.split()) for t in all_texts+all_captions)
    check('word_count',word_count==22550,word_count)
    prior_qa=json.loads((root/'QA_Content_Report.json').read_text())
    check('prior_qa_founder_ids_match', prior_qa['founder_attestation_posts']==founders)
    return {'audit_version':'1.0','method':'Independent Python stdlib audit; reads all canonical JSON records and package manifest entries; no OCR or model self-rating.',
            'source':{'path':'BTB_180_Day_Content.json','sha256':digest(raw),'bytes':len(raw),'schema_version':content['schema_version'],'traversed_json_values':traversed_values},
            'status':'PASS' if not errors else 'FAIL','checks':checks,'errors':errors,
            'counts':{'posts':len(posts),'slides':len(all_texts),'captions':len(all_captions),'alt_texts':sum(len(p['slides']) for p in posts),'copy_hashes_verified':sum(p['copy_sha256_expected']==p['copy_sha256_actual'] for p in post_results),'words_without_hashtags':word_count,'founder_attestation_posts':len(founders),'source_manifest_files':len(source_files)},
            'layout_counts':dict(Counter(p['layout'] for p in posts)),'pillar_counts':counts,
            'non_ascii_publishable_characters':[f'U+{ord(c):04X} {c}' for c in sorted(chars) if ord(c)>127],
            'source_manifest_files':source_files,'posts':post_results,
            'scope_limits':['Pattern screens cannot establish absence of unknown private identifiers; sanitized inputs only were used.',
                            'Safety/claim keywords were reviewed in supplied slide/caption context: caveats and fictional scripts remain unchanged; no new autobiography or clinical/legal certification inferred.',
                            'This audit establishes canonical input integrity and metadata consistency. Renderer DOM, glyph coverage, image geometry, image integrity and review UI require separate output QA.',
                            'No audience performance, original-logo approval, founder personal attestation or owner editorial approval is conferred.'],
            'approval_gates':{'owner_editorial_approval':'Required for all 180 posts','founder_attestation':founders}}


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--package-dir',type=Path,default=Path(__file__).resolve().parents[3])
    parser.add_argument('--report',type=Path,default=Path(__file__).resolve().parents[1]/'qa'/'independent-content-audit.json')
    args=parser.parse_args()
    report=audit(args.package_dir)
    args.report.parent.mkdir(parents=True,exist_ok=True)
    args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'status':report['status'],'counts':report['counts'],'errors':report['errors']},ensure_ascii=False))
    raise SystemExit(0 if report['status']=='PASS' else 1)
