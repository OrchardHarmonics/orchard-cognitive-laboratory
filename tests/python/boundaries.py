"""Independent finite semantics and negative-premise tests for downloaded native code."""
from pathlib import Path
import copy,runpy,unittest
root=Path(__file__).resolve().parents[2]/'dist/downloads'
m=runpy.run_path(str(root/'05_bounded_meta_extension.py'))
def call(name,*args,**kwargs):return m[name](*args,**kwargs)
def oracle(g,K,q,c,n):
    if g['op']=='join':
        a,b=oracle(g['left'],K,q,c,n),oracle(g['right'],K,q,c,n)
        return int(a or b) if g['operator']=='or' else int(a and b)
    required={i for i in range(n) if K//2**i%2}; asked={i for i in range(n) if q//2**i%2};s=len(required&asked)
    r=c if g.get('rhs')=='c' else c-1 if g.get('rhs')=='c-1' else g.get('rhs')
    return int(s%g['mod']==g['residue']) if g['op']=='mod' else int(s>=r) if g['op']=='ge' else int(s==r) if g['op']=='eq' else int(s<=r)
class Boundaries(unittest.TestCase):
    def test_independent_set_semantics_and_syntax(self):
        V=call('measurements','B',True)['observations']
        for recipe in ('base','pair-and','pair-or'):
            for g in call('generate',recipe):
                for o in V:self.assertEqual(call('denote',g,o['K'],o['q'],o['c']),oracle(g,o['K'],o['q'],o['c'],o['n']))
        bad={'op':'join','operator':'or','left':call('generate','pair-or')[-1],'right':{'op':'eq','rhs':0}}
        with self.assertRaises(ValueError):call('interpret',bad,15,1,4,'pair-or')
        with self.assertRaises(ValueError):call('fit',[bad],[])
    def test_constructor_contract_and_feedback(self):
        for table in ([],[0],[0,1,1,1,1],[False,1,1,1],[0,0,1,1]):self.assertFalse(call('qualify_constructor','pair-or',table=table)['passed'])
        self.assertFalse(call('qualify_constructor','pair-or',drop_old=True)['passed'])
        for key,value in [('trusted',False),('version',1)]:
            D=call('measurements','A');D[key]=value;self.assertEqual(call('acquire_method',D)['reason'],'feedback')
        D=call('measurements','A');D['observations'][1]=copy.deepcopy(D['observations'][0]);self.assertEqual(call('acquire_method',D)['reason'],'measurement-scope')
    def test_calibration_is_bound_to_audited_context(self):
        D=call('expression_evidence');D['cases'][0]['observations'][0]['K']=11
        with self.assertRaisesRegex(ValueError,'audited context'):call('acquire_expression',D)
    def test_replay_rejects_changes_and_matching_task_is_required(self):
        D,V=call('measurements','B'),call('measurements','B',True)
        self.assertEqual(call('acquire_repair',D,call('measurements','A',True),'pair-or')['reason'],'measurement-scope')
        a=call('acquire_repair',D,V,'pair-or')['artifact'];self.assertEqual(call('restore_repair',a),a)
        for change in ('binding','validation'):
            b=copy.deepcopy(a)
            if change=='binding':b['binding']+='altered'
            else:b['validation']['observations'][0]['y']^=1
            with self.assertRaises(ValueError):call('restore_repair',b)
    def test_incomplete_search_is_not_a_language_failure(self):
        D,V=call('measurements','B'),call('measurements','B',True)
        self.assertEqual(call('acquire_repair',D,V,'pair-or',46)['reason'],'search-incomplete')
        self.assertEqual(call('acquire_repair',D,V,'base')['reason'],'no-expression')
        self.assertEqual(call('acquire_repair',call('measurements','C'),call('measurements','C',True),'pair-or')['reason'],'no-expression')
    def test_runtime_never_reads_truth_and_keeps_gates_separate(self):
        class Descriptors(dict):
            def __getitem__(self,key):
                if key in ('K','task','mode'):raise AssertionError('Hidden truth read by policy')
                return super().__getitem__(key)
            def get(self,key,*args):
                if key in ('K','task','mode'):raise AssertionError('Hidden truth read by policy')
                return super().get(key,*args)
        repair=call('acquire_repair',call('measurements','B'),call('measurements','B',True),'pair-or')['artifact']
        L=m['OLD']+[{'op':'ge','rhs':1},repair['expression']]
        channel={'query':lambda q:{'y':oracle(repair['expression'],15,q,4,7),'version':0},'version':lambda:0}
        for patch,reason in [({},'current'),({'permission':False},'receiving-permission'),({'queryPermission':False},'query-permission'),({'refreshPermission':False},'refresh-permission'),({'watch':False},'watch'),({'budget':0},'budget')]:
            r=call('diagnose',Descriptors(n=7,c=4,budget=48,permission=True,**{}),channel,L,'pair-or') if not patch else call('diagnose',Descriptors(dict(n=7,c=4,budget=48,permission=True)|patch),channel,L,'pair-or')
            self.assertEqual(r['reason'],reason);self.assertEqual(len(r['trace']),48 if 'budget' not in patch else 0)
            self.assertEqual(r['decision'],'admit' if not patch else 'hold')
if __name__=='__main__':unittest.main()
