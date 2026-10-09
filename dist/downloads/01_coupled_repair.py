#!/usr/bin/env python3
# Mathematical provenance: Recursive Improvement Without Recursive Authority, supplied PDF p. 5 (worked encounter).
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


def initial(context="encounter-01"):
    return dict(context=context, revision=0, budget=1, reports=fixture(context),
                global_rule=False, refined=False, permission=False,
                exposeAllowed=True, coverageValid=True)


def fixture(context, anchor=True):
    reports = [dict(root="target-00", context=context, state=0, harmful=False),
               dict(root="target-01", context=context, state=1, harmful=True)]
    if anchor:
        reports += [dict(root="anchor-safe", context=context, state=2, harmful=False),
                    dict(root="anchor-harmful", context=context, state=2, harmful=True)]
    return reports


def ingest(reports, context):
    counts, seen = [[0, 0] for _ in range(32)], {}
    for r in reports:
        require(r["context"] == context and isinstance(r["root"], str) and r["root"], "Bad report context/root")
        require(type(r["state"]) is int and 0 <= r["state"] < 32 and type(r["harmful"]) is bool, "Bad report")
        if r["root"] in seen:
            require(seen[r["root"]] == r, "Conflicting root reuse")
            continue
        seen[r["root"]] = r
        counts[r["state"]][int(r["harmful"])] += 1
        require(sum(counts[r["state"]]) <= 3, "At most three roots per point")
    return counts


def rule_label(n, rest, budget, global_rule):
    if min(n) + rest > budget:
        return None
    claims = [v for v in (0, 1) if n[v] + (rest if global_rule else 0) > budget]
    return claims[0] if len(claims) == 1 else None


def evaluate(state):
    require(type(state["budget"]) is int and 0 <= state["budget"] <= 2, "Bad error allowance")
    require(not state["refined"] or state["exposeAllowed"], "Coordinate access denied")
    counts = ingest(state["reports"], state["context"])
    minima = [min(n) for n in counts]
    minimum = sum(minima)
    point = [rule_label(n, minimum-minima[x], state["budget"], state["global_rule"]) for x, n in enumerate(counts)]
    fibres = {}
    for x in range(32):
        fibres.setdefault(x if state["refined"] else x >> 1, []).append(x)
    receiving = [None]*32
    for fibre in fibres.values():
        v = point[fibre[0]]
        if v is not None and all(point[x] == v for x in fibre):
            for x in fibre:
                receiving[x] = v
    dp = [1]+[0]*state["budget"]
    for n in counts:
        nxt = [0]*len(dp)
        for used, count in enumerate(dp):
            for v in (0, 1):
                cost = n[1-v]
                if used+cost < len(dp):
                    nxt[used+cost] += count
        dp = nxt
    return dict(counts=counts, minimumErrors=minimum, consistent=minimum <= state["budget"],
                point=point, receiving=receiving, worlds=str(sum(dp)),
                coverage=sum(receiving[x] is not None for x in (0, 1)))


def qualify_rule(budget=1):
    cases = 0
    for safe in range(4):
        for harmful in range(4-safe):
            for rest in range(32):
                cases += 1
                n = [safe, harmful]
                allowed = [v for v in (0, 1) if n[1-v]+rest <= budget]
                old, new = rule_label(n, rest, budget, False), rule_label(n, rest, budget, True)
                require(new is None or allowed == [new], "Unsound rule")
                require(old is None or old == new, "Protected label lost")
    return dict(passed=True, cases=cases)


def state_binding(s):
    return canonical({k: v for k, v in s.items() if k != "permission"})


def capture(s):
    result = evaluate(s)
    return dict(snapshot=state_binding(s), labels=[result["receiving"][x] for x in (0, 1)],
                qualifierCases=qualify_rule(s["budget"])["cases"] if s["global_rule"] else 0)


def execute(s, receipt):
    reason = "coverage" if not s["coverageValid"] else "no-receipt" if not receipt else "stale" if receipt["snapshot"] != state_binding(s) else "permission" if not s["permission"] else "current"
    labels = evaluate(s)["receiving"] if reason == "current" else []
    return dict(reason=reason, decisions=["hold" if reason != "current" or labels[x] is None else "release" if labels[x] == 0 else "block" for x in (0, 1)])


def preserves(a, b):
    return all(v is None or b[k][x] == v for k in ("point", "receiving") for x, v in enumerate(a[k]))


def direct_search(s):
    before = evaluate(s)
    candidates = []
    for rule, view in itertools.product((False, True), repeat=2):
        if view and not s["exposeAllowed"]:
            candidates.append(dict(global_rule=rule, refined=view, coverage=None, eligible=False))
            continue
        nxt = dict(s, global_rule=rule, refined=view)
        after = evaluate(nxt)
        candidates.append(dict(global_rule=rule, refined=view, coverage=after["coverage"],
                               eligible=preserves(before, after) and after["coverage"] > before["coverage"]))
    chosen = next((r for r in candidates if r["eligible"]), None)
    return candidates, dict(s, global_rule=chosen["global_rule"], refined=chosen["refined"]) if chosen else None


ROUTE_ROUNDS = dict(intact=1, removed=1, restored=1, **{"relearn-one": 1, "relearn-two": 2}, fresh=2, specificity=1, preinstalled=0, direct=0)


def stage1(args):
    s = initial()
    s["budget"] = args.error_allowance
    s["permission"] = args.permission
    s["reports"] = fixture(s["context"], not args.no_anchor)
    candidates, repaired = direct_search(s)
    before, after = evaluate(s), evaluate(repaired or s)
    receipt = capture(repaired or s)
    revoked = dict(repaired or s, permission=False)
    return dict(stage=1, question="Can rule and view repair change warranted receiving labels with fixed evidence?",
                candidates=candidates, before=before["coverage"], after=after["coverage"],
                worldsBefore=before["worlds"], worldsAfter=after["worlds"],
                qualification=qualify_rule(s["budget"]), labels=receipt["labels"],
                live=execute(repaired or s, receipt), afterRevocation=execute(revoked, receipt))


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
    cli(1)

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
