#!/usr/bin/env python3
# Mathematical provenance: Constructive Enquiry and Acquired Model Extension, supplied PDF p. 3 (§§4–4.1).
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


OLD = [dict(op="eq", rhs="c"), dict(op="mod", mod=2, residue=1)]


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


def worlds(n, c, library):
    return [(canonical(g), K) for g in library for K in sets(n, c)]


def actions(h):
    return sorted({K for _, K in h})


@lru_cache(maxsize=128)
def compiled_plan(n, c, price, h):
    """Construct a tree from represented action disagreements, then replay every world."""
    program = {g: json.loads(g) for g, _ in h}
    counts = dict(predictions=0, scores=0, nodes=0, replays=0, replayPredictions=0)
    def build(support):
        counts["nodes"] += 1
        a = actions(support)
        if not a:
            return dict(kind="hold")
        if len(a) == 1:
            return dict(kind="leaf", K=a[0])
        best = None
        for q in queries(n):
            zero, one = [], []
            for g, K in support:
                counts["predictions"] += 1
                (one if denote(program[g], K, q, c) else zero).append((g, K))
            pairs = sum(K != J for _, K in zero for _, J in one)
            score = (pairs, min(len(zero), len(one)), -(q.bit_count() if price == "width" else 1), -q)
            counts["scores"] += 1
            if best is None or score > best[0]:
                best = score, q, zero, one
        if not best[0][0]:
            return dict(kind="hold")
        return dict(kind="query", q=best[1], zero=build(best[2]), one=build(best[3]))
    tree = build(h)
    for g, K in h:
        t, depth = tree, 0
        while t["kind"] == "query":
            depth += 1; counts["replayPredictions"] += 1
            require(depth < 2**n, "Cyclic tree")
            t = t["one" if denote(program[g], K, t["q"], c) else "zero"]
        require(t["kind"] == "leaf" and t["K"] == K, "Tree qualification failed")
        counts["replays"] += 1
    return tree, counts


def diagnose(settings, channel, library=OLD, recipe="base"):
    """Policy consumes descriptors and responses only, never simulator K or task."""
    n, c = settings.get("n", 7), settings.get("c", 3)
    sets(n, c)
    budget, price, route = settings.get("budget", 48), settings.get("price", "unit"), settings.get("route", "inherited")
    require(type(budget) is int and 0 <= budget <= 64 and price in ("unit", "width"), "Bad runtime budget/price")
    require(route in ("inherited", "active", "removed"), "Bad route")
    require(len(library) >= 2 and all(g in generate(recipe) for g in library) and len({canonical(g) for g in library}) == len(library), "Bad library")
    permission, watch = settings.get("permission", False), settings.get("watch", True)
    require(all(type(settings.get(k, default)) is bool for k, default in [("permission", False), ("watch", True), ("queryPermission", True), ("refreshPermission", True), ("knownFailure", False)]), "Bad permission flag")
    O, trace, h = [], [], worlds(n, c, library)
    tick = work = serviced = missed = 0
    reason, proposal, decision = "unresolved", None, "hold"
    history = [dict(query=0, tick=0, worlds=len(h), actions=len(actions(h)))]
    counts = dict(predictions=0, scores=0, nodes=0, replays=0, replayPredictions=0)
    def support():
        return [w for w in worlds(n, c, library) if all(denote(json.loads(w[0]), w[1], o["q"], c) == o["y"] for o in O)]
    def charge(kind, cost):
        nonlocal tick, work, serviced, missed, reason
        used = 0
        while used < cost:
            if tick >= budget:
                reason = "budget"
                return False
            tick += 1
            if tick % 3 == 0:
                serviced += int(watch); missed += int(not watch)
                trace.append(dict(tick=tick, kind="watch" if watch else "missed-watch"))
            else:
                used += 1; work += 1
                trace.append(dict(tick=tick, kind=kind))
        return True
    def follow(represented, phase):
        nonlocal h, reason
        t, cc = compiled_plan(n, c, price, tuple(represented))
        for k in counts:
            counts[k] += cc[k]
        while t["kind"] == "query":
            if not settings.get("queryPermission", True):
                reason = "query-permission"
                return False
            if not charge("query", t["q"].bit_count() if price == "width" else 1):
                return False
            answer = channel["query"](t["q"])
            require(type(answer.get("y")) is int and answer["y"] in (0, 1) and type(answer.get("version")) is int and answer["version"] >= 0, "Bad response")
            if O and answer["version"] != O[0]["version"]:
                reason = "source-version"
                return False
            O.append(dict(q=t["q"], **answer)); h = support()
            history.append(dict(query=len(O), tick=tick, worlds=len(h), actions=len(actions(h)), q=t["q"], y=answer["y"], phase=phase))
            t = t["one" if answer["y"] else "zero"]
        return True
    def finish():
        nonlocal tick, serviced, missed
        decision_tick = tick
        while tick < budget:
            tick += 1
            if tick % 3 == 0:
                serviced += int(watch); missed += int(not watch)
                trace.append(dict(tick=tick, kind="watch" if watch else "missed-watch"))
            else:
                trace.append(dict(tick=tick, kind="idle"))
        return dict(O=clone(O), proposal=proposal, decision=decision, reason=reason, decisionTick=decision_tick, ticks=tick, work=work, serviced=serviced, missed=missed, trace=trace, history=history, counts=counts, actions=actions(h))
    if not follow(h if route == "active" else worlds(n, c, OLD[:1]), "active" if route == "active" else "inherited"):
        return finish()
    if len(actions(h)) > 1:
        if route == "removed":
            reason = "enquiry-removed"
            return finish()
        if not follow(h, "constructed"):
            return finish()
    if not h:
        reason = "empty-support"
        return finish()
    if len(actions(h)) != 1:
        return finish()
    proposal = actions(h)[0]
    if not settings.get("refreshPermission", True):
        reason = "refresh-permission"
        return finish()
    if not charge("refresh", 1) or not charge("qualification", 1):
        return finish()
    version = channel["version"]()
    if "afterQualification" in channel:
        channel["afterQualification"]()
    if settings.get("knownFailure", False):
        reason = "coverage"
        return finish()
    if version != channel["version"]() or any(o["version"] != version for o in O):
        reason = "stale"
        return finish()
    if missed:
        reason = "watch"
        return finish()
    if not permission:
        reason = "receiving-permission"
        return finish()
    if not charge("admission", 1):
        return finish()
    if missed or version != channel["version"]():
        reason = "watch" if missed else "stale"
        return finish()
    decision, reason = "admit", "current"
    return finish()


def simulate(settings, library=OLD, recipe="base"):
    n, c, K, task = settings.get("n", 7), settings.get("c", 3), settings.get("K", 11), settings.get("task", "OR")
    require(K in sets(n, c), "Invalid actual set")
    version = 0
    def after():
        nonlocal version
        if settings.get("stale", False):
            version += 1
    channel = dict(query=lambda q: dict(y=target(task, K, q, c), version=version), version=lambda: version, afterQualification=after)
    r = diagnose(settings, channel, library, recipe)
    r["scoring"] = dict(correct=r["decision"] == "admit" and r["proposal"] == K,
                        incorrect=r["decision"] == "admit" and r["proposal"] != K, withheld=r["decision"] == "hold")
    return r


def tally(episodes):
    return dict(total=len(episodes), correct=sum(r["scoring"]["correct"] for r in episodes),
                incorrect=sum(r["scoring"]["incorrect"] for r in episodes), withheld=sum(r["scoring"]["withheld"] for r in episodes),
                queries=sum(len(r["O"]) for r in episodes), work=sum(r["work"] for r in episodes), missed=sum(r["missed"] for r in episodes))


def fit(programs, data, allowance=None):
    legal = generate("pair-or") + generate("pair-and")
    require(all(g in legal for g in programs) and len({canonical(g) for g in programs}) == len(programs), "Invalid selection language")
    allowance = len(programs) if allowance is None else allowance
    require(type(allowance) is int and 0 <= allowance <= 47, "Bad candidate allowance")
    rows = [dict(g=clone(g), mismatches=sum(denote(g, o["K"], o["q"], o["c"]) != o["y"] for o in data)) for g in programs[:allowance]]
    return dict(rows=rows, survivors=[r["g"] for r in rows if not r["mismatches"]], checked=len(rows), total=len(programs), predictions=len(rows)*len(data), complete=len(rows) == len(programs))


def expression_evidence():
    cases = []
    for n, c in itertools.product((4, 5), (2, 3)):
        bad = next((r for K in sets(n, c) if (r := simulate(dict(n=n, c=c, K=K, task="OR", budget=64, permission=True)))["scoring"]["incorrect"]), None)
        require(bad is not None, "No calibration failure")
        K = next(K for K in sets(n, c) if simulate(dict(n=n, c=c, K=K, task="OR", budget=64, permission=True))["scoring"]["incorrect"])
        cases.append(dict(n=n, c=c, K=K, proposal=bad["proposal"], trace=bad["O"], observations=[dict(n=n, c=c, K=K, q=q, y=target("OR", K, q, c)) for q in queries(n)]))
    V = [dict(n=6, c=c, K=K, q=q, y=target("OR", K, q, c)) for c in (2, 3, 4) for K in sets(6, c) for q in queries(6)]
    return dict(cases=cases, validation=V, trusted=True, version=0)


def acquire_expression(data):
    require(data.get("trusted") and data.get("version") == 0, "Trusted current feedback required")
    scopes = {(4, 2), (4, 3), (5, 2), (5, 3)}
    require({(r["n"], r["c"]) for r in data["cases"]} == scopes and len(data["cases"]) == 4, "Incomplete calibration scope")
    for r in data["cases"]:
        require(r["K"] != r["proposal"] and r["K"] in sets(r["n"], r["c"]), "Invalid audit")
        require(len(r["observations"]) == len(queries(r["n"])) and {o["q"] for o in r["observations"]} == set(queries(r["n"])), "Incomplete calibration measurements")
        require(all(o["n"] == r["n"] and o["c"] == r["c"] and o["K"] == r["K"] and type(o["y"]) is int and o["y"] in (0, 1) for o in r["observations"]), "Measurements do not match audited context")
    D = [o for r in data["cases"] for o in r["observations"]]
    f = fit(GRAMMAR, D)
    require(len(f["survivors"]) == 1, "Expression selection not unique")
    V = data["validation"]
    require(len(V) == 3100 and len({(o["n"], o["c"], o["K"], o["q"]) for o in V}) == 3100 and all(o["n"] == 6 and o["c"] in (2, 3, 4) and o["K"] in sets(6, o["c"]) and o["q"] in queries(6) for o in V), "Incomplete validation")
    expression = f["survivors"][0]
    require(all(denote(expression, o["K"], o["q"], o["c"]) == o["y"] for o in V), "Validation disagreement")
    core = dict(expression=expression, data=clone(data))
    return dict(core, binding=canonical(core), calibrationCount=len(D), validationCount=len(V), predictions=f["predictions"])


def restore_expression(a):
    require(a == acquire_expression(a["data"]), "Expression binding failed replay")
    return clone(a)


def runtime_settings(args, **extra):
    return dict(budget=args.budget if args.budget is not None else 48,
                price=args.price, permission=args.permission,
                queryPermission=not args.deny_query, refreshPermission=not args.deny_refresh,
                watch=not args.miss_watch, stale=args.stale, **extra)


def expression_comparison(artifact, budget=48, price="unit"):
    a = restore_expression(artifact)
    expanded = OLD+[a["expression"]]
    rows = []
    for arm in ("inherited", "removed", "restored", "active"):
        library = OLD if arm == "removed" else expanded
        if arm == "restored":
            library = OLD+[restore_expression(artifact)["expression"]]
        def episodes(tasks, ticks):
            return [simulate(dict(n=7, c=3, K=K, task=task, budget=ticks, price=price,
                                  permission=True, route="active" if arm == "active" else "inherited"), library)
                    for task in tasks for K in sets(7, 3)]
        main, stress = episodes(("AND", "XOR", "OR"), budget), episodes(("GE2", "EQ1"), 64)
        rows.append(dict(arm=arm, main=tally(main), stress=tally(stress)))
    return rows


def stage4(args):
    data = expression_evidence()
    artifact = restore_expression(acquire_expression(data))
    L = OLD+[artifact["expression"]]
    return dict(stage=4, expression=artifact["expression"], calibration=artifact["calibrationCount"],
                selectionPredictions=artifact["predictions"], validation=artifact["validationCount"],
                live=simulate(runtime_settings(args, n=7, c=3, K=11, task="OR"), L),
                comparison=expression_comparison(artifact, 48 if args.budget is None else args.budget, args.price),
                evidence=data if args.include_evidence else None, grammarExpanded=False)


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
    cli(4)

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
