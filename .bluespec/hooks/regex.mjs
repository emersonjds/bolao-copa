#!/usr/bin/env node

// src/cli/run-hook.ts
import process, { argv, stderr, stdout } from "node:process";
import { pathToFileURL } from "node:url";
var runHook = async (moduleUrl, handler) => {
  if (moduleUrl === pathToFileURL(argv[1]).href)
    try {
      stdout.write(await handler(argv.slice(2)));
    } catch (error) {
      stderr.write(`${error instanceof Error ? error.message : String(error)}
`), process.exitCode = 1;
    }
};

// src/hooks/regex/scan.ts
var escapeOverlaps = (left, right) => {
  if (left === right) return !0;
  let pair = /* @__PURE__ */ new Set([left, right]);
  return pair.has("d") && pair.has("w");
}, literalMatchesEscape = (literal, escape) => escape === "w" ? /[A-Za-z0-9_]/.test(literal) : escape === "d" ? /[0-9]/.test(literal) : escape === "s" ? /\s/.test(literal) : !1, isEscapeMember = (member) => member.length === 2 && member[0] === "\\", isRangeMember = (member) => member.length === 3 && member[1] === "-", literalInRange = (literal, range) => literal >= range[0] && literal <= range[2], rangesOverlap = (left, right) => left[0] <= right[2] && right[0] <= left[2], escapeMeetsRange = (escape, range) => escape === "w" ? rangesOverlap("a-z", range) || rangesOverlap("A-Z", range) || rangesOverlap("0-9", range) : escape === "d" ? rangesOverlap("0-9", range) : escape !== "s", memberPairOverlaps = (left, right) => {
  let leftRange = isRangeMember(left), rightRange = isRangeMember(right), leftEscape = isEscapeMember(left), rightEscape = isEscapeMember(right);
  return leftRange && rightRange ? rangesOverlap(left, right) : leftRange ? rightEscape ? escapeMeetsRange(right[1], left) : literalInRange(right, left) : rightRange ? leftEscape ? escapeMeetsRange(left[1], right) : literalInRange(left, right) : leftEscape && rightEscape ? escapeOverlaps(left[1], right[1]) : leftEscape ? literalMatchesEscape(right, left[1]) : rightEscape ? literalMatchesEscape(left, right[1]) : left === right;
}, membersOverlap = (left, right) => {
  for (let member of left)
    for (let other of right)
      if (memberPairOverlaps(member, other)) return !0;
  return !1;
}, isCoveredBy = (member, set) => {
  for (let other of set) if (memberPairOverlaps(member, other)) return !0;
  return !1;
}, isSubsetOf = (inner, outer) => {
  for (let member of inner) if (!isCoveredBy(member, outer)) return !1;
  return !0;
}, positiveMeetsNegated = (positive, negated) => !isSubsetOf(positive.members, negated.members), membersSetsOverlap = (left, right) => !left.negated && !right.negated ? membersOverlap(left.members, right.members) : left.negated && right.negated ? !0 : left.negated ? positiveMeetsNegated(right, left) : positiveMeetsNegated(left, right), charSetsOverlap = (left, right) => left === "none" || right === "none" ? !1 : left === "any" || right === "any" ? !0 : membersSetsOverlap(left, right), unionCharSet = (left, right) => left === "any" || right === "any" ? "any" : left === "none" ? right : right === "none" ? left : left.negated || right.negated ? "any" : {
  members: /* @__PURE__ */ new Set([...left.members, ...right.members]),
  negated: !1
}, anyOverlap = (sets) => {
  for (let left = 0; left < sets.length; left += 1)
    for (let right = left + 1; right < sets.length; right += 1)
      if (charSetsOverlap(sets[left], sets[right])) return !0;
  return !1;
}, isRangeQuantifierAt = (source, position) => {
  if (source[position] !== "{") return !1;
  let closing = source.indexOf("}", position);
  return closing === -1 ? !1 : /^\{\d+(,\d*)?\}$/.test(source.slice(position, closing + 1));
}, isUnboundedRange = (range) => /^\{\d+,\}$/.test(range), requiresOneRepetition = (range) => !/^\{0[,}]/.test(range), consumeQuantifier = (cursor) => {
  let char = cursor.source[cursor.position], unbounded = !1, required = !1;
  if (char === "*" || char === "+" || char === "?")
    unbounded = char !== "?", required = char === "+", cursor.position += 1;
  else if (isRangeQuantifierAt(cursor.source, cursor.position)) {
    let closing = cursor.source.indexOf("}", cursor.position), range = cursor.source.slice(cursor.position, closing + 1);
    unbounded = isUnboundedRange(range), required = requiresOneRepetition(range), cursor.position = closing + 1;
  } else
    return {
      quantified: !1,
      greedy: !1,
      unbounded: !1,
      required: !0
    };
  let greedy = !0;
  return cursor.source[cursor.position] === "?" && (cursor.position += 1, greedy = !1), cursor.repetitionCount += 1, { quantified: !0, greedy, unbounded, required };
}, BROAD_ESCAPES = /* @__PURE__ */ new Set(["w", "W", "s", "S", "D"]), isBroadEscape = (escape) => BROAD_ESCAPES.has(escape), escapeCharSet = (escape) => {
  let lower = escape.toLowerCase();
  return "dws".includes(lower) ? { members: /* @__PURE__ */ new Set([`\\${lower}`]), negated: escape !== lower } : { members: /* @__PURE__ */ new Set([escape]), negated: !1 };
}, readClassFootprint = (cursor) => {
  cursor.position += 1;
  let negated = cursor.source[cursor.position] === "^";
  negated && (cursor.position += 1);
  let members = /* @__PURE__ */ new Set();
  for (; cursor.position < cursor.source.length; ) {
    let char = cursor.source[cursor.position];
    if (char === "]")
      return cursor.position += 1, { charSet: { members, negated }, negated };
    if (char === "\\") {
      let next = cursor.source[cursor.position + 1] ?? "";
      members.add("dws".includes(next.toLowerCase()) ? `\\${next}` : next), cursor.position += 2;
      continue;
    }
    let after = cursor.source[cursor.position + 1], rangeEnd = cursor.source[cursor.position + 2];
    if (after === "-" && rangeEnd !== void 0 && rangeEnd !== "]") {
      members.add(`${char}-${rangeEnd}`), cursor.position += 3;
      continue;
    }
    members.add(char), cursor.position += 1;
  }
  return { charSet: { members, negated }, negated };
}, characterBody = (charSet, permissive) => ({
  charSet,
  endsGreedy: !1,
  singleChar: !0,
  permissive,
  gatedDanger: !1,
  consumes: !0,
  loopAmbiguous: !1
}), ASSERTION_PREFIXES = ["?=", "?!", "?<=", "?<!"], assertionPrefixAt = (source, position) => {
  for (let prefix of ASSERTION_PREFIXES)
    if (source.startsWith(prefix, position)) return prefix;
  return null;
}, skipGroupBody = (cursor) => {
  let depth = 1;
  for (; cursor.position < cursor.source.length && depth > 0; ) {
    let char = cursor.source[cursor.position];
    if (char === "\\") {
      cursor.position += 2;
      continue;
    }
    if (char === "[") {
      readClassFootprint(cursor);
      continue;
    }
    char === "(" ? depth += 1 : char === ")" && (depth -= 1), cursor.position += 1;
  }
  cursor.position -= 1;
}, emptyBody = () => ({
  charSet: "none",
  endsGreedy: !1,
  singleChar: !1,
  permissive: !1,
  gatedDanger: !1,
  consumes: !1,
  loopAmbiguous: !1
}), scanAtomBody = (cursor) => {
  let char = cursor.source[cursor.position];
  if (char === "(") {
    cursor.position += 1;
    let assertion = assertionPrefixAt(cursor.source, cursor.position);
    if (assertion)
      return cursor.position += assertion.length, skipGroupBody(cursor), cursor.position += 1, emptyBody();
    let group = scanSequence(cursor);
    return cursor.position += 1, {
      charSet: group.footprint,
      endsGreedy: group.endsGreedy,
      singleChar: !1,
      permissive: group.permissiveTail,
      gatedDanger: group.unresolvedDanger,
      consumes: group.required,
      loopAmbiguous: group.loopAmbiguous
    };
  }
  if (char === "[") {
    let { charSet, negated } = readClassFootprint(cursor);
    return characterBody(charSet, negated);
  }
  if (char === ".")
    return cursor.position += 1, characterBody("any", !0);
  if (char === "\\") {
    let next = cursor.source[cursor.position + 1] ?? "";
    return cursor.position += 2, characterBody(escapeCharSet(next), isBroadEscape(next));
  }
  return cursor.position += 1, characterBody({ members: /* @__PURE__ */ new Set([char]), negated: !1 }, !1);
}, scanAtom = (cursor) => {
  let body = scanAtomBody(cursor), mark = consumeQuantifier(cursor), loops = mark.quantified && mark.greedy && mark.unbounded, directTail = loops && body.singleChar, groupTail = !mark.quantified && body.endsGreedy, directPermissive = loops && body.permissive, groupPermissive = !mark.quantified && body.permissive, nested = loops && body.loopAmbiguous;
  return {
    charSet: body.charSet,
    loops,
    tailGreedy: directTail || groupTail,
    permissiveTail: directPermissive || groupPermissive,
    gatedDanger: nested || body.gatedDanger,
    required: body.consumes && mark.required
  };
}, adjacentOverlap = (previous, atom) => previous.loops && atom.loops && charSetsOverlap(previous.charSet, atom.charSet), resolveGates = (atoms, followedByRequired) => {
  let suffixRequired = followedByRequired, confirmed = !1, unresolved = !1;
  for (let index = atoms.length - 1; index >= 0; index -= 1) {
    let atom = atoms[index];
    atom.gatedDanger && (suffixRequired ? confirmed = !0 : unresolved = !0), atom.required && (suffixRequired = !0);
  }
  return { confirmed, unresolved };
}, anchorAtom = () => ({
  charSet: "none",
  loops: !1,
  tailGreedy: !1,
  permissiveTail: !1,
  gatedDanger: !1,
  required: !0
}), scanAlternative = (cursor) => {
  let atoms = [], realAtoms = [], footprint = "none", loops = !1, previous = null, pendingScan = !1;
  for (; cursor.position < cursor.source.length; ) {
    let char = cursor.source[cursor.position];
    if (char === ")" || char === "|") break;
    if (char === "$") {
      !cursor.anchored && previous?.tailGreedy && (cursor.backtrack = !0), atoms.push(anchorAtom()), previous = null, cursor.position += 1;
      continue;
    }
    if (char === "^") {
      realAtoms.length === 0 && (cursor.anchored = !0), cursor.position += 1;
      continue;
    }
    let atom = scanAtom(cursor);
    pendingScan && !cursor.anchored && (cursor.backtrack = !0), footprint = unionCharSet(footprint, atom.charSet), loops = loops || atom.loops, previous && adjacentOverlap(previous, atom) && (atom.gatedDanger = !0), atom.permissiveTail && (pendingScan = !0), atoms.push(atom), realAtoms.push(atom), previous = atom;
  }
  let lastReal = realAtoms[realAtoms.length - 1] ?? null;
  return {
    atoms,
    footprint,
    loops,
    endsGreedy: lastReal?.tailGreedy ?? !1,
    permissiveTail: lastReal?.permissiveTail ?? !1,
    required: atoms.some((atom) => atom.required)
  };
}, scanSequence = (cursor) => {
  let alternatives = [scanAlternative(cursor)];
  for (; cursor.source[cursor.position] === "|"; )
    cursor.position += 1, alternatives.push(scanAlternative(cursor));
  let unresolvedDanger = !1;
  for (let alternative of alternatives) {
    let { confirmed, unresolved } = resolveGates(alternative.atoms, !1);
    confirmed && (cursor.backtrack = !0), unresolved && (unresolvedDanger = !0);
  }
  let footprints = alternatives.map((alternative) => alternative.footprint), alternationOverlap = alternatives.length > 1 && anyOverlap(footprints), containsLoop = alternatives.some((alternative) => alternative.loops);
  return {
    footprint: footprints.reduce(unionCharSet, "none"),
    endsGreedy: alternatives.some((alternative) => alternative.endsGreedy),
    permissiveTail: alternatives.some(
      (alternative) => alternative.permissiveTail
    ),
    unresolvedDanger,
    required: alternatives.every((alternative) => alternative.required),
    loopAmbiguous: alternationOverlap || containsLoop
  };
}, scanQuantifiers = (source) => {
  let cursor = {
    source,
    position: 0,
    repetitionCount: 0,
    anchored: !1,
    backtrack: !1
  };
  return scanSequence(cursor), {
    repetitionCount: cursor.repetitionCount,
    backtrack: cursor.backtrack
  };
};

// src/hooks/regex/regex.ts
var DEFAULT_REPETITION_LIMIT = 25, validSource = (regex) => {
  try {
    if (regex instanceof RegExp)
      return new RegExp(regex.source, regex.flags), regex.source;
    let source = String(regex);
    return new RegExp(source), source;
  } catch {
    return null;
  }
}, parseLimit = (raw) => {
  if (raw === void 0) return;
  let limit = Number(raw);
  if (!Number.isInteger(limit) || limit < 0)
    throw new Error(
      `repetition limit must be a non-negative integer, got "${raw}"`
    );
  return limit;
}, check = (regex, options = /* @__PURE__ */ Object.create(null)) => {
  let source = validSource(regex);
  if (source === null) return "invalid regex";
  let repetitionLimit = options.repetitionLimit ?? DEFAULT_REPETITION_LIMIT, { repetitionCount, backtrack } = scanQuantifiers(source);
  return repetitionCount <= repetitionLimit && !backtrack ? "safe" : "unsafe";
};

// src/hooks/regex/index.ts
await runHook(import.meta.url, (args) => {
  if (args[0] === void 0)
    throw new Error("regex hook needs a pattern as its first argument");
  return `${check(args[0], { repetitionLimit: parseLimit(args[1]) })}
`;
});
