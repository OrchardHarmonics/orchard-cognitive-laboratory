#!/usr/bin/env python3
"""Stage seven: a native, self-contained finite reference experiment.

New authored study inspired by The Aligned Signal, Preface and sections 3, 7, 19.
Copyright (c) 2026 Kimberley Laverne Asher, to the extent of rights held.
Orchard Noncommercial Research and Evaluation Licence 1.0; see LICENSE.txt.
Commercial use requires separate written permission. Standard library only.
All effects are simulated. Native receipts are not a JavaScript interchange format.
"""
import argparse
import itertools
import json
from pathlib import Path

FIELDS = ['s', 'c', 'permission', 'anchor', 'current']
ROUTES = ['learned', 'removed', 'restored', 'preinstalled', 'direct']
CONDITIONS = ['valid', 'renamed', 'bad-feedback', 'unapproved', 'off-language', 'wrong-map']
BASE = [{'op': op, 'rhs': rhs} for op in ['ge', 'eq', 'le'] for rhs in [0, 1, 2, 3, 4, 'c', 'c-1']]
BASE += [{'op': 'mod', 'mod': mod, 'residue': residue} for mod in [2, 3] for residue in range(mod)]
ATOMS = [g for g in BASE if g['op'] == 'eq']

def generate(recipe):
    if recipe not in ['base', 'pair-and', 'pair-or']:
        raise ValueError('Unknown constructor recipe')
    extra = [] if recipe == 'base' else [{'op': 'join', 'operator': recipe[5:], 'left': a, 'right': b} for a, b in itertools.combinations(ATOMS, 2)]
    return BASE + extra

def interpret(g, s, c):
    if g['op'] == 'join':
        a, b = interpret(g['left'], s, c), interpret(g['right'], s, c)
        return int(a and b) if g['operator'] == 'and' else int(a or b)
    if g['op'] == 'mod':
        return int(s % g['mod'] == g['residue'])
    r = c if g['rhs'] == 'c' else c-1 if g['rhs'] == 'c-1' else g['rhs']
    return int(s >= r) if g['op'] == 'ge' else int(s <= r) if g['op'] == 'le' else int(s == r)

def risk(s, c, kind='valid'):
    return int(s == 1 or s == c or (kind == 'off-language' and s == 0))

def old_risk(s, c):
    return int(s == 0 or s == c-1)

def reference(x, kind='valid'):
    return int(not risk(x['s'], x['c'], kind) and x['permission'] and x['anchor'] and x['current'])

def domain(totals):
    return [dict(s=s, c=c, permission=bits & 1, anchor=(bits >> 1) & 1, current=(bits >> 2) & 1) for c in totals for s in range(c+1) for bits in range(8)]

def data(kind='valid', totals=(3, 4)):
    return [dict(s=s, c=c, y=risk(s, c, kind)) for c in totals for s in range(c+1)]

def fit(grammar, records):
    # Charge and perform every candidate/record prediction, including rejected candidates.
    survivors = []
    for g in grammar:
        mismatches = sum(interpret(g, o['s'], o['c']) != o['y'] for o in records)
        if not mismatches:
            survivors.append(g)
    return dict(survivors=survivors, predictions=len(grammar)*len(records), candidates=len(grammar))

def primitive_oracle(g, s, c):
    if g['op'] == 'mod':
        return int(s % g['mod'] == g['residue'])
    bound = {'c': c, 'c-1': c-1}.get(g['rhs'], g['rhs'])
    comparisons = {'ge': s >= bound, 'eq': s == bound, 'le': s <= bound}
    return int(comparisons[g['op']])

def source_method():
    """Reconstruct the same count-level constructor acquisition as stage five.

    Source A has 44 query measurements, a 2170-measurement semantic validation,
    and 312 preserved denotations per candidate constructor. Meanings are supplied.
    """
    records = []
    for n, c, K in [(4, 3, 7), (5, 4, 15)]:
        for q in range(1, 2**n-1):
            s = (K & q).bit_count()
            records.append(dict(s=s, c=c, y=int(s == 0 or s == c)))
    methods, work = [], 0
    for recipe in ['base', 'pair-and', 'pair-or']:
        grammar = generate(recipe)
        fitted = fit(grammar, records)
        work += fitted['predictions']
        preserved = 0
        for g in BASE:
            for c in [2, 3, 4]:
                for s in range(c+1):
                    if g in grammar and interpret(g, s, c) == primitive_oracle(g, s, c):
                        preserved += 1
        work += preserved
        truth_ok = True
        if recipe != 'base':
            op = recipe[5:]
            truth_ok = all(interpret(dict(op='join', operator=op, left=dict(op='eq', rhs=a), right=dict(op='eq', rhs=b)), 0, 3) == int((a == 0 and b == 0) if op == 'and' else (a == 0 or b == 0)) for a in [0, 1] for b in [0, 1])
            work += 4
        if preserved == 312 and truth_ok and len(fitted['survivors']) == 1 and len(grammar) > 26:
            methods.append((recipe, fitted['survivors'][0]))
    if len(methods) != 1:
        raise ValueError('Source method acquisition failed')
    recipe, witness = methods[0]
    validation_count, mismatches = 0, 0
    for c in [3, 4]:
        for K in range(64):
            if K.bit_count() == c:
                for q in range(1, 63):
                    s = (K & q).bit_count()
                    mismatches += interpret(witness, s, c) != int(s == 0 or s == c)
                    validation_count += 1
    if mismatches:
        raise ValueError('Source method validation failed')
    return dict(recipe=recipe, work=work+validation_count)

def key(x, fields):
    return tuple(x[f] for f in fields)

def qualify_view(fields, rows, kind='valid'):
    fibres, witness = {}, None
    for x in rows:
        k, y = key(x, fields), reference(x, kind)
        if k not in fibres:
            fibres[k] = (x, y)
        elif fibres[k][1] != y and witness is None:
            witness = dict(left=fibres[k][0], right=x, leftAnswer=fibres[k][1], rightAnswer=y)
    return dict(adequate=witness is None, witness=witness, visits=len(rows), classes=len(fibres))

def search_view(kind='valid'):
    rows = domain([3, 4, 5])
    checks = []
    for mask in range(32):
        fields = [f for i, f in enumerate(FIELDS) if mask & (1 << i)]
        checks.append(dict(fields=fields, **qualify_view(fields, rows, kind)))
    ok = sorted([r for r in checks if r['adequate']], key=lambda r: len(r['fields']))
    return dict(fields=ok[0]['fields'], minimumSize=len(ok[0]['fields']), minima=sum(len(r['fields']) == len(ok[0]['fields']) for r in ok), candidates=len(checks), visits=sum(r['visits'] for r in checks), coarse=qualify_view(['s', 'c'], rows, kind))

def adapt(x, condition):
    result = dict(x)
    if condition == 'wrong-map':
        result['s'], result['c'] = x['c'], x['s']
    # Known names map bijectively to these meanings; no schema is inferred.
    return result

def map_qualified(condition):
    rows = domain([3, 4, 5])
    return dict(passed=all(adapt(x, condition) == x for x in rows), checks=len(rows) if condition in ['renamed', 'wrong-map'] else 0)

def census(expression, fields, condition='valid', grant=False, qualified=False):
    rows, groups = domain([6, 7, 8, 9]), {}
    for x in rows:
        y = int(not interpret(expression, x['s'], x['c']) and x['permission'] and x['anchor'] and x['current'])
        groups.setdefault(key(x, fields), set()).add(y)
    r = dict(total=len(rows), warranted=0, wrongLabels=0, admissions=0, wrongAdmissions=0, blocks=0, held=0)
    for actual in rows:
        answers = groups.get(key(adapt(actual, condition), fields), set())
        y = next(iter(answers)) if len(answers) == 1 else None
        if y is not None:
            r['warranted'] += 1
            r['wrongLabels'] += int(y != reference(actual, condition))
        if not qualified or not grant or y is None:
            r['held'] += 1
        elif y:
            r['admissions'] += 1
            r['wrongAdmissions'] += int(not reference(actual, condition))
        else:
            r['blocks'] += 1
    return r

def unchecked_census(kind='valid'):
    rows = domain([6, 7, 8, 9])
    admitted = [x for x in rows if not old_risk(x['s'], x['c'])]
    return dict(total=len(rows), admissions=len(admitted), wrongAdmissions=sum(not reference(x, kind) for x in admitted))

def capture(expression, fields, condition, revision=1):
    return dict(contract='orchard-obligations/1', revision=revision, binding=json.dumps(dict(contract='orchard-obligations/1', revision=revision, expression=expression, fields=fields, condition=condition), separators=(',', ':')))

def is_current(receipt, expression, fields, condition, revision=1):
    return receipt == capture(expression, fields, condition, revision)

def compare(route='learned', condition='valid'):
    if route not in ROUTES or condition not in CONDITIONS:
        raise ValueError('Unknown setting')
    source = source_method() if route in ['learned', 'removed', 'restored'] else None
    if source:
        # Standalone bootstrap followed by native replay. Restore route replays once more.
        replay = source_method()
        if replay != source:
            raise ValueError('Source replay failed')
        if route == 'restored' and source_method() != source:
            raise ValueError('Restoration replay failed')
    recipe = 'base' if route == 'removed' else source['recipe'] if source else 'pair-or'
    grammar = BASE + generate('pair-and')[26:] + generate('pair-or')[26:] if route == 'direct' else generate(recipe)
    teaching, validation = data(condition), data(condition, [5])
    if condition == 'bad-feedback':
        for o in teaching:
            o['y'] = old_risk(o['s'], o['c'])
    fitted = fit(grammar, teaching)
    expression = fitted['survivors'][0] if len(fitted['survivors']) == 1 else None
    mismatches = sum(interpret(expression, o['s'], o['c']) != o['y'] for o in validation) if expression else None
    projection, mapping = search_view(condition), map_qualified(condition)
    passed = condition != 'unapproved' and mapping['passed'] and expression is not None and mismatches == 0
    reason = 'reference-change-not-authorized' if condition == 'unapproved' else 'descriptor-map-failed' if not mapping['passed'] else ('ambiguous-expression' if fitted['survivors'] else 'no-expression') if expression is None else 'validation-failed' if mismatches else 'qualified'
    old_expression = dict(op='join', operator='or', left=dict(op='eq', rhs=0), right=dict(op='eq', rhs='c-1'))
    legacy_rows = data('valid', [6, 7, 8, 9])
    legacy = dict(predictions=len(legacy_rows), preserved=sum(interpret(old_expression, o['s'], o['c']) == old_risk(o['s'], o['c']) for o in legacy_rows))
    costs = dict(fit=fitted['predictions'], validation=len(validation) if expression else 0, projection=projection['visits'], mapping=mapping['checks'], legacy=legacy['predictions'])
    costs['total'] = sum(costs.values())
    return dict(route=route, condition=condition, passed=passed, reason=reason, recipe=recipe, candidates=len(grammar), teaching=len(teaching), validation=len(validation) if expression else 0, validationMismatches=mismatches, expression=expression, projection=projection, mapping=mapping, costs=costs, receipt=capture(expression, projection['fields'], condition) if passed else None, unchecked=unchecked_census(condition), frozen=census(expression, projection['fields'], condition, True, True) if passed else None, sourceCommonWork=source['work']*(3 if route == 'restored' else 2) if source else 0, legacy=legacy)

def at_phase(study, phase, grant=False, budget=None, revision=1):
    if type(phase) is not int or not 0 <= phase <= 3 or type(grant) is not bool or type(revision) is not int or revision < 1:
        raise ValueError('Invalid phase, grant or revision')
    budget = study['costs']['total'] if budget is None else budget
    if type(budget) is not int or budget < 0:
        raise ValueError('Invalid work budget')
    current = study['passed'] and is_current(study['receipt'], study['expression'], study['projection']['fields'], study['condition'], revision)
    ready = phase == 3 and current and budget >= study['costs']['total']
    r = census(study['expression'], study['projection']['fields'] if phase == 3 else ['s', 'c'], study['condition'], grant, ready) if study['expression'] else dict(total=272, warranted=0, wrongLabels=0, admissions=0, wrongAdmissions=0, blocks=0, held=272)
    if phase < 2 or not study['passed'] or (phase == 3 and not ready):
        r['warranted'] = 0
    reason = 'new-contract-not-yet-qualified' if phase < 3 else study['reason'] if not study['passed'] else 'receipt-stale' if not current else 'work-prefix-incomplete' if budget < study['costs']['total'] else 'receiving-grant-off' if not grant else 'current-qualified-use'
    return dict(**r, ready=bool(ready), current=bool(current), reason=reason)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--route', choices=ROUTES, default='learned')
    parser.add_argument('--condition', choices=CONDITIONS, default='valid')
    parser.add_argument('--phase', type=int, choices=range(4), default=3)
    parser.add_argument('--permission', action='store_true', help='Supply a current simulated receiving grant; default off')
    parser.add_argument('--budget', type=int, default=None)
    parser.add_argument('--revision', type=int, default=1)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    study = compare(args.route, args.condition)
    result = dict(stage=7, study=study, live=at_phase(study, args.phase, args.permission, args.budget, args.revision), limits='Supplied exact feedback, fixed count meanings and reference, finite projection search and honest local host. Frozen scoring is internal verification, not independent replication. No general alignment or MeRSIA rate proof.')
    text = json.dumps(result, indent=2) + '\n'
    if args.output:
        args.output.write_text(text)
    else:
        print(text, end='')

if __name__ == '__main__':
    main()
