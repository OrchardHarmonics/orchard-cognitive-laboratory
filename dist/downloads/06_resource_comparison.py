#!/usr/bin/env python3
# Mathematical provenance: New authored toy inspired by Towards Recursively Self-Improving Alignment (PDF p. 3) and Constructive Enquiry §10.2 (p. 7).
# Finite educational implementation; see the laboratory for definitions and scope.
"""Orchard finite laboratory, native Python reference implementation.

Standard library only. Predictions, checking, simulator truth and action permission
are kept separate. Fixtures are authored finite worlds, not empirical AI safety data.
Software: Orchard Noncommercial Research and Evaluation Licence 1.0.
Commercial use requires separate written permission; publications retain their own terms.
"""


import argparse


import copy


import itertools


import json


from functools import lru_cache


from pathlib import Path


def require(ok, message):
    if not ok:
        raise ValueError(message)


def canonical(x):
    return json.dumps(x, sort_keys=True, separators=(",", ":"))


def clone(x):
    return copy.deepcopy(x)


ROUTE_ROUNDS = dict(intact=1, removed=1, restored=1, **{"relearn-one": 1, "relearn-two": 2}, fresh=2, specificity=1, preinstalled=0, direct=0)


GRAMMAR = [dict(op=op, rhs=r) for op in ("ge", "eq", "le") for r in (0, 1, 2, 3, 4, "c", "c-1")]+[dict(op="mod", mod=m, residue=r) for m in (2, 3) for r in range(m)]


def sets(n, c):
    require(4 <= n <= 7 and 2 <= c <= 4 and c < n, "Descriptor out of scope")
    return [k for k in range(2**n) if k.bit_count() == c]


def queries(n):
    return list(range(1, 2**n-1))


def generate(recipe="base", drop_old=False):
    require(recipe in ("base", "pair-and", "pair-or"), "Unknown constructor")
    g = clone(GRAMMAR[1:] if drop_old else GRAMMAR)
    if recipe != "base":
        atoms = [x for x in GRAMMAR if x["op"] == "eq"]
        g += [dict(op="join", operator=recipe.split("-")[1], left=clone(a), right=clone(b)) for a, b in itertools.combinations(atoms, 2)]
    return g


def interpret(g, K, q, c, recipe="base"):
    require(g in generate(recipe), "Program violates constructor syntax/depth")
    return denote(g, K, q, c)


def denote(g, K, q, c):
    if g["op"] == "join":
        a, b = denote(g["left"], K, q, c), denote(g["right"], K, q, c)
        return int(a or b) if g["operator"] == "or" else int(a and b)
    s = (K & q).bit_count()
    if g["op"] == "mod":
        return int(s % g["mod"] == g["residue"])
    r = c if g["rhs"] == "c" else c-1 if g["rhs"] == "c-1" else g["rhs"]
    return int(s >= r) if g["op"] == "ge" else int(s == r) if g["op"] == "eq" else int(s <= r)


def target(task, K, q, c):
    s = (K & q).bit_count()
    if task in ("A", "B", "C"):
        return int(s in ({0, c} if task == "A" else {0, c-1} if task == "B" else {0, 1, c}))
    return dict(AND=int(s == c), XOR=s % 2, OR=int(s >= 1), GE2=int(s >= 2), EQ1=int(s == 1))[task]


def measurements(task, validation=False):
    scopes = [(6, c, K) for c in (3, 4) for K in sets(6, c)] if validation else [(4, 3, 7), (5, 4, 15)]
    return dict(contract="orchard-method-task-"+task+"/1", source="supplied-measurements", trusted=True, version=0,
                observations=[dict(n=n, c=c, K=K, q=q, y=target(task, K, q, c)) for n, c, K in scopes for q in queries(n)])


def valid_measurements(data, validation=False):
    if not data or data.get("trusted") is not True or data.get("version") != 0:
        return False
    O, expected = data.get("observations", []), 2170 if validation else 44
    return data.get("contract") in ["orchard-method-task-"+t+"/1" for t in ("A", "B", "C", "OR")] and len(O) == expected and len({(o["n"], o["c"], o["K"], o["q"]) for o in O}) == expected and all(o["K"] in sets(o["n"], o["c"]) and o["q"] in queries(o["n"]) and o["y"] in (0, 1) and ((o["n"] == 6 and o["c"] in (3, 4)) if validation else (o["n"], o["c"], o["K"]) in [(4, 3, 7), (5, 4, 15)]) for o in O)


def fit(programs, data, allowance=None):
    legal = generate("pair-or") + generate("pair-and")
    require(all(g in legal for g in programs) and len({canonical(g) for g in programs}) == len(programs), "Invalid selection language")
    allowance = len(programs) if allowance is None else allowance
    require(type(allowance) is int and 0 <= allowance <= 47, "Bad candidate allowance")
    rows = [dict(g=clone(g), mismatches=sum(denote(g, o["K"], o["q"], o["c"]) != o["y"] for o in data)) for g in programs[:allowance]]
    return dict(rows=rows, survivors=[r["g"] for r in rows if not r["mismatches"]], checked=len(rows), total=len(programs), predictions=len(rows)*len(data), complete=len(rows) == len(programs))


def qualify_constructor(recipe, drop_old=False, table=None):
    g = generate(recipe, drop_old)
    preserved = failures = 0
    for old in GRAMMAR:
        for c in (2, 3, 4):
            for s in range(c+1):
                preserved += 1
                failures += int(old not in g or denote(old, 2**c-1, 2**s-1, c) != interpret(old, 2**c-1, 2**s-1, c, recipe))
    truth_failures = 0
    if recipe != "base":
        expected = [0, 0, 0, 1] if recipe == "pair-and" else [0, 1, 1, 1]
        supplied = expected if table is None else table
        truth_failures = (sum(a != b for a, b in zip(supplied, expected))
                          if isinstance(supplied, list) and len(supplied) == 4 and all(type(a) is int and a in (0, 1) for a in supplied) else 4)
    return dict(passed=not failures and not truth_failures and len(g) <= 47, preservationCases=preserved,
                preservationFailures=failures, truthCases=0 if recipe == "base" else 4, truthFailures=truth_failures)


def acquire_method(data=None, drop_old=False, table=None):
    data = measurements("A") if data is None else data
    result = dict(status="hold", reason="feedback", artifact=None, rows=[], predictions=0)
    if data.get("trusted") is not True or data.get("version") != 0:
        return result
    if not valid_measurements(data):
        return dict(result, reason="measurement-scope")
    old = fit(generate(), data["observations"])
    result["predictions"] = old["predictions"]
    if old["survivors"]:
        return dict(result, reason="no-language-witness")
    survivors = []
    for recipe in ("base", "pair-and", "pair-or"):
        q = qualify_constructor(recipe, drop_old, table if recipe == "pair-or" else None)
        f = old if recipe == "base" else fit(generate(recipe), data["observations"])
        if recipe != "base":
            result["predictions"] += f["predictions"]
        result["rows"].append(dict(recipe=recipe, qualification=q, fit=f))
        if recipe != "base" and q["passed"] and len(f["survivors"]) == 1:
            survivors.append((recipe, f["survivors"][0]))
    if len(survivors) != 1:
        return dict(result, reason="no-qualified-method")
    recipe, witness = survivors[0]
    V = measurements("A", True)
    mismatches = sum(denote(witness, o["K"], o["q"], o["c"]) != o["y"] for o in V["observations"])
    if mismatches:
        return dict(result, reason="method-validation")
    core = dict(recipe=recipe, data=clone(data), witness=witness, validation=V, maxNewLeaves=2)
    return dict(result, status="qualified", reason="method-acquired", validationCount=len(V["observations"]), artifact=dict(core, binding=canonical(core)))


def acquire_repair(data, validation, recipe="base", allowance=47):
    result = dict(status="hold", reason="feedback", artifact=None, fit=None, validationCount=0, mismatches=None)
    if not data.get("trusted") or not validation.get("trusted") or data.get("version") != 0 or validation.get("version") != 0:
        return result
    if data["contract"] != validation["contract"] or not valid_measurements(data) or not valid_measurements(validation, True):
        return dict(result, reason="measurement-scope")
    f = fit(generate(recipe), data["observations"], allowance)
    result["fit"] = f
    if not f["complete"]:
        return dict(result, reason="search-incomplete")
    if len(f["survivors"]) != 1:
        return dict(result, reason="ambiguous-expression" if f["survivors"] else "no-expression")
    expression = f["survivors"][0]
    result["validationCount"] = len(validation["observations"])
    result["mismatches"] = sum(denote(expression, o["K"], o["q"], o["c"]) != o["y"] for o in validation["observations"])
    if result["mismatches"]:
        return dict(result, reason="repair-validation")
    core = dict(recipe=recipe, expression=expression, data=clone(data), validation=clone(validation))
    return dict(result, status="qualified", reason="repair-acquired", artifact=dict(core, binding=canonical(core)))


def restore_repair(a):
    require(a and a == acquire_repair(a["data"], a["validation"], a["recipe"])["artifact"], "Repair binding failed replay")
    return clone(a)


def rate_study(kind="valid", validation_weight=1, preservation_weight=1, include_common=False):
    require(kind in ("valid", "wrong-teaching", "untrusted", "stale", "bad-validation", "drop-old"), "Unknown rate fixture")
    require(validation_weight in (1, 2, 4) and preservation_weight in (1, 2, 4), "Bad resource weights")
    D, V = measurements("B"), measurements("B", True)
    if kind == "wrong-teaching":
        D["observations"] = measurements("A")["observations"]
    if kind == "untrusted":
        D["trusted"] = False
    if kind == "stale":
        D["version"] = 1
    if kind == "bad-validation":
        V["observations"][0]["y"] ^= 1
    drop_old = kind == "drop-old"
    f = fit(generate("pair-or", drop_old), D["observations"])
    candidate = f["survivors"][0] if f["complete"] and len(f["survivors"]) == 1 else None
    raw = dict(arm="fit-only", status="fitted" if candidate else "hold", reason="unique-fit" if candidate else "no-unique-fit", expression=candidate,
               selection=f["predictions"], validation=0, preservation=0, truth=0, replaySelection=0, replayValidation=0)
    checked = dict(arm="checked", status="hold", reason="feedback", expression=None, selection=0, validation=0, preservation=0, truth=0, replaySelection=0, replayValidation=0)
    if D["trusted"] and V["trusted"] and D["version"] == 0 and V["version"] == 0:
        q = qualify_constructor("pair-or", drop_old)
        checked.update(preservation=q["preservationCases"], truth=q["truthCases"])
        if not q["passed"]:
            checked["reason"] = "preservation"
        else:
            result = acquire_repair(D, V, "pair-or")
            checked.update(selection=result["fit"]["predictions"] if result["fit"] else 0, validation=result["validationCount"], reason=result["reason"])
            if result["artifact"]:
                retained = restore_repair(result["artifact"])
                checked.update(status="qualified", expression=retained["expression"], replaySelection=result["fit"]["predictions"], replayValidation=result["validationCount"])
    method = acquire_method()
    common = dict(selection=method["predictions"], validation=method["validationCount"],
                  preservation=sum(r["qualification"]["preservationCases"] for r in method["rows"]), truth=sum(r["qualification"]["truthCases"] for r in method["rows"]), replaySelection=0, replayValidation=0)
    def cost(row):
        return row["selection"]+row["validation"]*validation_weight+(row["preservation"]+row["truth"])*preservation_weight+row["replaySelection"]+row["replayValidation"]*validation_weight
    def score(g):
        if g is None:
            return None
        correct = total = 0
        for c in (3, 4):
            for K in sets(7, c):
                for q in queries(7):
                    total += 1
                    correct += denote(g, K, q, c) == target("B", K, q, c)
        return dict(correct=correct, total=total, accuracy=correct/total)
    common_work = cost(common)
    common_charged = common_work if include_common else 0
    arms = [dict(a, work=cost(a), chargedWork=cost(a)+common_charged,
                 threshold=cost(a)+common_charged if a["expression"] else None, score=score(a["expression"])) for a in (raw, checked)]
    return dict(kind=kind, weights=dict(validation=validation_weight, preservation=preservation_weight), includeCommon=include_common,
                common=common, commonWork=common_work, commonCharged=common_charged, arms=arms,
                limitation="This declared logical-work index omits host overhead and hardware cost. Its stronger checking obligations are not evidence of faster acquisition or full MeRSIA.")


def stage6(args):
    return dict(stage=6, study=rate_study(args.rate_case, args.validation_weight, args.preservation_weight, args.include_common))


def cli(stage):
    parser = argparse.ArgumentParser(description="Native Python Orchard laboratory stage "+str(stage)+". Standard library only; all actions simulated.")
    parser.add_argument("--output", type=Path, help="Save the computed JSON report")
    if stage < 6:
        parser.add_argument("--permission", action="store_true", help="Allow local simulated receiving use; defaults off")
    if stage == 1:
        parser.add_argument("--error-allowance", type=int, choices=(0, 1, 2), default=1)
        parser.add_argument("--no-anchor", action="store_true")
    if stage == 2:
        parser.add_argument("--route", choices=tuple(ROUTE_ROUNDS))
        parser.add_argument("--rounds", type=int, choices=(0, 1, 2))
    if stage in (3, 4, 5):
        parser.add_argument("--budget", type=int, help="Runtime ticks, not development work (stage 3 default 18, stages 4/5 default 48)")
        parser.add_argument("--price", choices=("unit", "width"), default="unit")
        parser.add_argument("--deny-query", action="store_true")
        parser.add_argument("--deny-refresh", action="store_true")
        parser.add_argument("--miss-watch", action="store_true")
        parser.add_argument("--stale", action="store_true")
    if stage in (4, 5):
        parser.add_argument("--include-evidence", action="store_true")
    if stage == 5:
        parser.add_argument("--cardinality", type=int, choices=(3, 4), default=4)
        parser.add_argument("--allowance", type=int, choices=(0, 26, 46, 47), default=47)
    if stage == 6:
        parser.add_argument("--rate-case", choices=("valid", "wrong-teaching", "untrusted", "stale", "bad-validation", "drop-old"), default="valid")
        parser.add_argument("--validation-weight", type=int, choices=(1, 2, 4), default=1)
        parser.add_argument("--preservation-weight", type=int, choices=(1, 2, 4), default=1)
        parser.add_argument("--include-common", action="store_true")
    args = parser.parse_args()
    report = globals()["stage"+str(stage)](args)
    report["implementation"] = "Native Python 3.10+ reference; no JavaScript or external packages required"
    report["release"] = "Orchard Noncommercial Research and Evaluation Licence 1.0; commercial use requires separate written permission; source publications retain their own terms"
    text = json.dumps(report, indent=2, ensure_ascii=False)+"\n"
    if args.output:
        args.output.write_text(text, encoding="utf-8")
    else:
        print(text, end="")


if __name__ == "__main__":
    cli(6)

# Full software licence, carried with this standalone download:
# ORCHARD NONCOMMERCIAL RESEARCH AND EVALUATION LICENCE 1.0
# Effective for the software in laboratory version 0.6.1, 9 October 2026
# 
# Licensor: Kimberley Laverne Asher
# Contact: kimberlasher@gmail.com
# Copyright (c) 2026 Kimberley Laverne Asher, to the extent of rights held.
# 
# 1. SCOPE AND ACCEPTANCE
# 
# "Software" means the Orchard Cognitive Laboratory implementation distributed
# with this notice: its original JavaScript, Python, HTML, CSS, tests, build tools,
# computed fixture reports and implementation documentation. It excludes the
# books, papers and other source publications in sources/, the original Orchard
# logo and other separately identified third-party material. Those materials
# retain their own terms. This licence does not apply to earlier versions merely
# because they have the same name.
# 
# The permissions below are granted only to the extent the Licensor holds the
# relevant rights. Exercising permissions that require this licence signifies
# acceptance of its conditions. Reading this notice alone creates no obligation.
# No fee is charged for the permissions granted here.
# 
# 2. PERMITTED RESEARCH AND EVALUATION
# 
# You may inspect, run and reproduce the Software for noncommercial study,
# education, research, testing, evaluation and reproducibility. You may modify
# it and create works based on it for those purposes, subject to sections 3 and 4.
# 
# A permitted purpose must not be primarily intended for commercial advantage,
# monetary compensation, commercial product development or commercial business
# operations. Research salary, academic employment and a research grant do not,
# by themselves, make scholarly research commercial. Commercial R&D or work
# intended to develop a commercial product or service is not permitted, even
# when performed by an educational, charitable or government organisation.
# 
# Any visitor may read the laboratory website and interact with its unmodified
# demonstration solely to assess the work and consider a research collaboration
# or commercial licensing enquiry. This limited demonstration evaluation does
# not authorise product development, integration, production use or commercial
# deployment of the Software.
# 
# 3. COPIES, MODIFICATIONS AND RESEARCH SHARING
# 
# You may share unmodified or modified Software solely for the permitted
# purposes. Every copy or substantial portion must carry this complete licence,
# the Licensor identification and copyright notice, and the identification of
# any separately licensed materials it contains. Preserve existing attribution
# and identify your changes clearly, including that your version is unofficial.
# Do not represent your changes as an authorised Orchard release or endorsement.
# 
# You may not sublicense the Licensor's material, remove its restrictions, or
# redistribute it on terms that purport to authorise a prohibited use. Each
# recipient receives the same offer directly from the Licensor. Your own
# original contributions may have their own terms, but those terms cannot grant
# additional rights in the Licensor's material. Sharing a Software modification
# does not grant permission to include or adapt source publications or artwork.
# 
# You may publish noncommercial research findings, measurements and criticism,
# with appropriate scholarly attribution. The licence does not claim ownership
# of your independently authored findings or of mathematical facts.
# 
# 4. USES REQUIRING SEPARATE WRITTEN PERMISSION
# 
# This licence grants no right to sell the Software or derivatives, offer paid
# services based on it, incorporate it into a commercial product, perform
# commercial R&D with it, or use it for commercial business operations, hosted
# services or production deployments. Such uses require a separate written
# commercial agreement with the Licensor. A modification, change of name or
# port to another programming language does not remove these conditions where
# protected Software expression is reused or adapted.
# 
# 5. PUBLICATIONS, IDEAS, BRAND AND OTHER RIGHTS
# 
# The supplied source publications retain their stated CC-BY-NC-ND 4.0 terms.
# This Software licence neither replaces nor restricts permissions already
# granted by those terms. In particular, CC-BY-NC-ND permits noncommercial
# reproduction/sharing of the original under its conditions and permits making
# and reproducing, but not sharing, noncommercial adapted material. Consult the
# actual CC licence for its full terms and exceptions.
# 
# This licence covers protected expression in the Software, not mathematical
# ideas, facts, algorithms, methods or functionality as such. It does not
# prohibit an independent implementation merely because it uses the same ideas.
# No statement here promises exclusive copyright control of the Orchard's
# underlying mathematics or restricts applicable fair dealing, fair use or
# other statutory rights that do not require the Licensor's permission.
# 
# No patent, trademark, logo-use, endorsement, confidential-material access or
# undisclosed-framework licence is granted. Brand references for accurate
# attribution are distinct from use of the logo as your own product identity.
# The Software's licence does not authorise distributing the original logo.
# Material not covered here needs its own applicable permission.
# 
# 6. TERM, BREACH AND OTHER AGREEMENTS
# 
# These permissions continue while you comply with these terms. They terminate
# if you materially breach them; uses after termination require new permission.
# The Licensor may separately offer commercial or other permissions. Changes to
# future versions do not retrospectively change this version's grant to users
# who comply with it. A separate signed agreement governs only the permissions
# it expressly covers. No other permission is implied.
# 
# 7. EXPERIMENTAL SOFTWARE AND LIABILITY
# 
# The Software is an educational research demonstration. It is supplied as is,
# without warranties to the extent permitted by applicable law, including
# warranties of accuracy, fitness, merchantability, non-infringement or safety.
# Finite fixture checks are not certification for operational use. The Software
# is not supplied as an operational safety controller.
# 
# To the extent permitted by applicable law, the Licensor is not liable for
# losses or damages arising from use of the Software. Nothing excludes liability
# that applicable law does not allow to be excluded, or limits mandatory rights.
# 
# END OF LICENCE
