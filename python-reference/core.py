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


# 01: finite evidence and receiving views.
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


def eligible(s, nxt):
    a, b = evaluate(s), evaluate(nxt)
    return b["consistent"] and preserves(a, b) and b["coverage"] > a["coverage"]


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


# 02: qualified construction-policy acquisition, retention and intervention.
POLICY_SCOPE = "orchard-five-bit/b1/counts-at-most-three/v1"
ROUTE_ROUNDS = dict(intact=1, removed=1, restored=1, **{"relearn-one": 1, "relearn-two": 2}, fresh=2, specificity=1, preinstalled=0, direct=0)


def supplied_policy():
    return dict(kind="fallback", old=dict(kind="hold"), next=dict(kind="inquiry"))


def valid_policy(p, depth=0):
    require(isinstance(p, dict) and depth < 12, "Oversized policy")
    k = p.get("kind")
    if k in ("hold", "inquiry", "construct-rule"):
        require(set(p) == {"kind"}, "Unexpected primitive fields")
    elif k == "fallback":
        require(set(p) == {"kind", "old", "next"}, "Bad fallback")
        valid_policy(p["old"], depth+1); valid_policy(p["next"], depth+1)
    elif k == "compose":
        require(set(p) == {"kind", "basis"}, "Bad compositor")
        valid_policy(p["basis"], depth+1)
        require(not contains(p["basis"], "compose"), "Recursive captured basis")
    else:
        raise ValueError("Unknown policy")


def contains(p, kind):
    return p["kind"] == kind or p["kind"] == "fallback" and (contains(p["old"], kind) or contains(p["next"], kind))


def projection(p):
    valid_policy(p)
    if p["kind"] == "compose":
        return dict(kind="hold")
    if p["kind"] != "fallback":
        return clone(p)
    if p["next"]["kind"] == "compose":
        return projection(p["old"])
    return dict(kind="fallback", old=projection(p["old"]), next=projection(p["next"]))


def remove_method(p, kind):
    valid_policy(p)
    if p["kind"] == kind:
        return dict(kind="hold")
    if p["kind"] == "fallback":
        if p["next"]["kind"] == kind:
            return clone(p["old"])
        return dict(kind="fallback", old=remove_method(p["old"], kind), next=remove_method(p["next"], kind))
    return clone(p)


def policy_counts():
    return dict(rounds=0, candidates=0, constructorCalls=0, qualifierCases=0, componentUses=0, pairChecks=0, executionCalls=0)


def construct_rule(s, count):
    count["constructorCalls"] += 1
    if s["global_rule"]:
        return None
    count["qualifierCases"] += qualify_rule(s["budget"])["cases"]
    nxt = dict(s, global_rule=True)
    return dict(state=nxt, steps=["rule"], via="construct-rule") if eligible(s, nxt) else None


def transaction(s, order, count):
    count["pairChecks"] += 1
    if not s["exposeAllowed"]:
        return None
    current, trace = s, []
    for step in order:
        before = evaluate(current)
        nxt = dict(current, **({"global_rule": True} if step == "rule" else {"refined": True}))
        if step == "rule":
            count["qualifierCases"] += qualify_rule(s["budget"])["cases"]
        after = evaluate(nxt)
        require(state_binding(dict(nxt, global_rule=s["global_rule"], refined=s["refined"])) == state_binding(s), "Evidence changed")
        if not after["consistent"] or not preserves(before, after):
            return None
        trace.append(dict(step=step, before=before["coverage"], after=after["coverage"], gain=after["coverage"]-before["coverage"], worlds=after["worlds"], emittedActions=0))
        current = nxt
    return dict(state=current, steps=order, trace=trace, via="compose") if eligible(s, current) else None


def compose(s, basis, count):
    if not s["exposeAllowed"] or s["global_rule"] and s["refined"]:
        return None
    for internal in ([s] if s["refined"] else [s, dict(s, refined=True)]):
        component = invoke(basis, internal, count)
        if not component or component["via"] != "construct-rule":
            continue
        count["componentUses"] += 1
        for order in (["view", "rule"], ["rule", "view"]):
            result = transaction(s, order, count)
            if result:
                return result
    return None


def invoke(p, s, count):
    valid_policy(p)
    if p["kind"] == "fallback":
        return invoke(p["old"], s, count) or invoke(p["next"], s, count)
    if p["kind"] == "construct-rule":
        return construct_rule(s, count)
    if p["kind"] == "compose":
        return compose(s, p["basis"], count)
    return None


def extend(old, candidate, witness, count):
    valid_policy(old); valid_policy(candidate)
    if candidate["kind"] == "compose":
        require(candidate["basis"] == projection(old), "Captured basis mismatch")
    require(invoke(old, witness, count) is None, "Old fallback not reached")
    effect = invoke(candidate, witness, count)
    require(effect and eligible(witness, effect["state"]), "No positive witness")
    return dict(kind="fallback", old=clone(old), next=clone(candidate)), effect


def acquire_policy():
    count, old = policy_counts(), supplied_policy()
    count["rounds"] += 1; count["candidates"] += 1
    witness = dict(initial("source-acquisition"), refined=True)
    policy, effect = extend(old, dict(kind="construct-rule"), witness, count)
    core = dict(version="construction-policy/1", scope=POLICY_SCOPE, policy=policy)
    return dict(core, binding=canonical(core), qualification=dict(cases=count["qualifierCases"], positiveWitnessGain=evaluate(effect["state"])["coverage"]-evaluate(witness)["coverage"]), acquisition=dict(rounds=count["rounds"], counts=count))


def restore_policy(artifact):
    require(artifact == acquire_policy(), "Policy acquisition or binding failed replay")
    return clone(artifact)


def inheritance_route(route="intact", permission=False, rounds=None, access=True, counterfeit=False):
    require(route in ROUTE_ROUNDS, "Unknown route")
    limit = ROUTE_ROUNDS[route] if rounds is None else rounds
    require(type(limit) is int and 0 <= limit <= 2, "Bad round allowance")
    artifact, count = restore_policy(acquire_policy()), policy_counts()
    policy = artifact["policy"]
    if route in ("removed", "restored", "relearn-one", "relearn-two"):
        policy = remove_method(policy, "construct-rule")
    if route == "restored":
        require(policy == artifact["policy"]["old"], "Restoration requires exact scaffold")
        policy = clone(artifact["policy"])
    if route == "fresh":
        policy = dict(kind="hold")
    if route == "specificity":
        policy = remove_method(policy, "inquiry")
    if route == "preinstalled":
        policy = dict(kind="fallback", old=clone(policy), next=dict(kind="compose", basis=projection(policy)))
    contexts, learning = [], []
    for index in range(2):
        s = dict(initial("receiving-"+str(index+1)), permission=permission, exposeAllowed=access)
        for r in s["reports"]:
            r["root"] = s["context"]+"/"+r["root"]
            if r["state"] < 2 and index % 2:
                r["harmful"] = not r["harmful"]
        before = evaluate(s)
        if route == "direct":
            candidates, nxt = direct_search(s)
            count["candidates"] += len(candidates); count["qualifierCases"] += qualify_rule()["cases"]
            effect = dict(state=nxt, steps=["rule", "view"], via="supplied-direct-search", trace=[]) if nxt else None
        else:
            effect = invoke(policy, s, count)
            while not effect and count["rounds"] < limit:
                count["rounds"] += 1; count["candidates"] += 1
                learned = None
                if not contains(policy, "construct-rule") and route in ("relearn-one", "relearn-two", "fresh"):
                    internal = dict(s, refined=True)
                    if access and not invoke(policy, internal, count):
                        policy, _ = extend(policy, dict(kind="construct-rule"), internal, count)
                        learned = "construct-rule"
                else:
                    basis = projection(policy)
                    candidate = dict(kind="compose", basis=supplied_policy() if counterfeit else basis)
                    if counterfeit:
                        try:
                            extend(policy, candidate, s, count)
                        except ValueError:
                            pass
                    elif compose(s, basis, count):
                        policy, _ = extend(policy, candidate, s, count)
                        learned = "compose"
                learning.append(dict(round=count["rounds"], learned=learned))
                effect = invoke(policy, s, count)
        final = effect["state"] if effect else s
        after, receipt = evaluate(final), capture(final)
        execution = execute(final, receipt)
        count["qualifierCases"] += receipt["qualifierCases"]; count["executionCalls"] += 1
        require(before["worlds"] == after["worlds"] and before["counts"] == after["counts"], "Changed world set")
        contexts.append(dict(labels=[after["receiving"][x] for x in (0, 1)], decisions=execution["decisions"], before=before["coverage"], after=after["coverage"], worlds=after["worlds"]))
    return dict(route=route, repaired=sum(x["after"] for x in contexts), decisive=sum(v != "hold" for x in contexts for v in x["decisions"]), contexts=contexts, counts=count, learning=learning)


# 03/04/05: finite response languages and question construction.
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


def restore_method(a):
    require(a and a == acquire_method(a["data"])["artifact"], "Constructor binding failed replay")
    return clone(a)


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


# 04: audited expression acquisition, independently computed calibration fixtures.
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


def stage2(args):
    return dict(stage=2, live=inheritance_route(args.route or "intact", args.permission, args.rounds),
                source=acquire_policy(), comparison=[inheritance_route(r, True) for r in ROUTE_ROUNDS],
                evidenceTransfer="none", authorityExpanded=False)


def enquiry_census(budget=18, price="unit"):
    rows = []
    for route in ("constructive", "removed", "active"):
        def episodes(tasks):
            return [simulate(dict(n=4, c=2, K=K, task=task, budget=budget, price=price,
                                  permission=True, route="inherited" if route == "constructive" else route))
                    for task in tasks for K in sets(4, 2)]
        def total(xs):
            t = tally(xs)
            return dict(episodes=t["total"], correct=t["correct"], incorrect=t["incorrect"],
                        withheld=t["withheld"], queries=t["queries"],
                        ticks=sum(x["decisionTick"] for x in xs), missedWatches=t["missed"])
        rows.append(dict(route=route, registered=total(episodes(("AND", "XOR"))), outside=total(episodes(("OR",)))))
    return rows


def runtime_settings(args, **extra):
    return dict(budget=args.budget if args.budget is not None else 48,
                price=args.price, permission=args.permission,
                queryPermission=not args.deny_query, refreshPermission=not args.deny_refresh,
                watch=not args.miss_watch, stale=args.stale, **extra)


def stage3(args):
    budget = 18 if args.budget is None else args.budget
    require(budget <= 48, "Stage three budget is at most 48")
    settings = runtime_settings(args, n=4, c=2, K=5, task="XOR")
    settings["budget"] = budget
    return dict(stage=3, live=simulate(settings), comparison=enquiry_census(budget, args.price),
                compilerSupplied=True, authorityExpanded=False)


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


def meta_receiving(settings, source, repair=None):
    source = restore_expression(source)
    library, recipe, has_task_model = OLD+[source["expression"]], "base", False
    if repair:
        a = restore_repair(repair)
        library += [a["expression"]]; recipe = a["recipe"]
        has_task_model = a["data"]["contract"] == "orchard-method-task-"+settings.get("task", "B")+"/1"
    opts = dict(settings, knownFailure=settings.get("knownFailure", False) or settings.get("task", "B") == "B" and not has_task_model)
    return simulate(opts, library, recipe)


def meta_study(source, budget=48, price="unit", allowance=47):
    source = restore_expression(source)
    method = acquire_method()
    checked = restore_method(method["artifact"])
    rows = []
    for arm in ("fixed", "learned", "removed", "restored", "preinstalled"):
        restored = restore_method(method["artifact"]) if arm == "restored" else checked
        recipe = "base" if arm in ("fixed", "removed") else restored["recipe"]
        result = acquire_repair(measurements("B"), measurements("B", True), recipe, allowance)
        L = OLD+[source["expression"]]+([result["artifact"]["expression"]] if result["artifact"] else [])
        def episodes(tasks):
            return [simulate(dict(n=7, c=c, K=K, task=task, budget=budget, price=price,
                                  permission=True, knownFailure=task == "B" and not result["artifact"]), L, recipe)
                    for task in tasks for c in (3, 4) for K in sets(7, c)]
        rows.append(dict(arm=arm, recipe=recipe, methodAcquisitionRounds=int(arm in ("learned", "removed", "restored")),
                         methodRestorationReplays=int(arm == "restored"),
                         candidatesChecked=result["fit"]["checked"], candidateSpace=len(generate(recipe)),
                         selectionPredictions=result["fit"]["predictions"], validationPredictions=result["validationCount"],
                         newTask=tally(episodes(("B",))), legacy=tally(episodes(("AND", "XOR", "OR")))))
    return rows


def stage5(args):
    source = acquire_expression(expression_evidence())
    method = acquire_method()
    a = restore_method(method["artifact"])
    repair = acquire_repair(measurements("B"), measurements("B", True), a["recipe"], args.allowance)
    c = args.cardinality
    live = meta_receiving(runtime_settings(args, n=7, c=c, K=2**c-1, task="B"), source, repair["artifact"])
    boundary = acquire_repair(measurements("C"), measurements("C", True), "pair-or")
    return dict(stage=5, method=method if args.include_evidence else dict(recipe=a["recipe"], witness=a["witness"], predictions=method["predictions"], validationCount=method["validationCount"], qualification=qualify_constructor(a["recipe"])),
                laterRepair=repair["artifact"]["expression"] if repair["artifact"] else None,
                repairStatus=repair["reason"], live=live,
                comparison=meta_study(source, 48 if args.budget is None else args.budget, args.price, args.allowance),
                boundary=dict(reason=boundary["reason"], survivors=len(boundary["fit"]["survivors"])),
                metaGrammarExpanded=False, authorityExpanded=False)


# 06: declared logical-work curves; deliberately no full development-rate claim.
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
