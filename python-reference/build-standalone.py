"""Rebuild the six standalone scripts; optionally recompute their default reports."""
import argparse,ast,html,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
core=(root/'python-reference/core.py').read_text();lines=core.splitlines(True);tree=ast.parse(core)
blocks={}
for node in tree.body:
    if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef,ast.ClassDef)):blocks[node.name]=node
    elif isinstance(node,ast.Assign):
        for target in node.targets:
            if isinstance(target,ast.Name):blocks[target.id]=node
names=['01_coupled_repair','02_qualified_inheritance','03_constructive_enquiry','04_acquired_expression','05_bounded_meta_extension','06_resource_comparison']
references=[
 'Recursive Improvement Without Recursive Authority, supplied PDF p. 5 (worked encounter).',
 'Recursive Improvement Without Recursive Authority, supplied PDF pp. 4–7 and Appendix D.',
 'Constructive Enquiry and Acquired Model Extension, supplied PDF p. 2 (§3).',
 'Constructive Enquiry and Acquired Model Extension, supplied PDF p. 3 (§§4–4.1).',
 'New authored toy inspired by The Aligned Signal §18.4 (PDF p. 89) and Constructive Enquiry §10.2 (p. 7).',
 'New authored toy inspired by Towards Recursively Self-Improving Alignment (PDF p. 3) and Constructive Enquiry §10.2 (p. 7).'
]
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--reports',action='store_true',help='Also execute every standalone script and replace its computed default report');args=parser.parse_args()
for i,name in enumerate(names,1):
    required={'cli','stage'+str(i)};pending=list(required)
    while pending:
        for child in ast.walk(blocks[pending.pop()]):
            if isinstance(child,ast.Name) and child.id in blocks and child.id not in required:required.add(child.id);pending.append(child.id)
    kept=[]
    for node in tree.body:
        if isinstance(node,(ast.Import,ast.ImportFrom)) or isinstance(node,ast.Expr) and isinstance(node.value,ast.Constant) and isinstance(node.value.value,str) or any(node is blocks[k] for k in required):
            start=min([node.lineno]+[d.lineno for d in getattr(node,'decorator_list',[])])-1
            kept.append(''.join(lines[start:node.end_lineno])+'\n\n')
    source='#!/usr/bin/env python3\n# Mathematical provenance: '+references[i-1]+'\n# Finite educational implementation; see the laboratory for definitions and scope.\n'+''.join(kept)+'if __name__ == "__main__":\n    cli('+str(i)+')\n'
    source += '\n# Full software licence, carried with this standalone download:\n'+''.join('# '+line+'\n' for line in (root/'LICENSE.txt').read_text().splitlines())
    ast.parse(source);dest=root/'dist/downloads';(dest/(name+'.py')).write_text(source)
    inspection=dest/(name+'_source.html')
    if inspection.exists():
        page=inspection.read_text();marker='<h2>Complete source</h2><pre><code>';inspection.write_text(page.split(marker)[0]+marker+html.escape(source)+'</code></pre></main></html>')
    if args.reports:subprocess.run([sys.executable,str(dest/(name+'.py')),'--output',str(dest/(name+'_results.json'))],check=True)
    print('Built '+name,flush=True)

if args.reports:
    subprocess.run([sys.executable,str(root/"python-reference/build-pages.py")],check=True)
