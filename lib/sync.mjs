// Core sync logic: push a content repo's STRUCTURE to CyberBackend.
// Reads a course manifest (course.json) and:
//   1. publishLab for the capstone lab (if present),
//   2. syncActivities for the course + lessons (with content references) + children.
// The MDX bodies stay in the content repo; the backend stores only references.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const IMPORT_NONE = {};

export async function runSync({
  manifestPath = "course.json",
  api = process.env.CYBERBACKEND_URL ?? "https://cyberbackend.com",
  tokenUrl = process.env.CYBERAUTH_TOKEN_URL ?? "https://www.cyberauth.co/api/auth/oauth2/token",
  clientId = process.env.CYBERAUTH_CLIENT_ID,
  clientSecret = process.env.CYBERAUTH_CLIENT_SECRET,
  accessToken = process.env.CYBERAUTH_ACCESS_TOKEN,
  ref = process.env.GITHUB_SHA ?? "main",
  dryRun = false,
  log = console.log,
} = IMPORT_NONE) {
  const API = api.replace(/\/$/, "");
  const m = JSON.parse(readFileSync(resolve(manifestPath), "utf8"));

  const activities = [{ ...m.course }];
  for (const { lesson, extra } of m.lessons ?? []) {
    activities.push({ ...lesson, contentRepo: m.repo, contentRef: ref });
    for (const e of extra ?? []) activities.push(e);
  }

  if (dryRun) {
    log(`repo: ${m.repo} @ ${ref}`);
    if (m.lab) log(`lab: ${m.lab.slug}`);
    log(`activities: ${activities.length} (1 course + ${(m.lessons ?? []).length} lessons + children)`);
    return { dryRun: true, activities: activities.length };
  }

  const token = accessToken ?? (await clientToken({ tokenUrl, clientId, clientSecret, api: API }));

  let resolved = activities;
  if (m.lab) {
    const { publishLab } = await gql(API, token, `mutation ($i: PublishLabInput!) { publishLab(input: $i) { labId state } }`, { i: m.lab });
    log(`lab: ${publishLab.labId} (${publishLab.state})`);
    resolved = activities.map((a) => (a.contains ? { ...a, contains: a.contains.map((c) => (c === "@lab" ? publishLab.labId : c)) } : a));
  }
  const { syncActivities } = await gql(API, token, `mutation ($a: [ActivityInput!]!) { syncActivities(activities: $a) }`, { a: resolved });
  log(`synced ${syncActivities} activities from ${m.repo} @ ${ref}`);
  return { synced: syncActivities };
}

async function clientToken({ tokenUrl, clientId, clientSecret, api }) {
  if (!clientId || !clientSecret) {
    throw new Error("Set CYBERAUTH_CLIENT_ID and CYBERAUTH_CLIENT_SECRET (or CYBERAUTH_ACCESS_TOKEN, or run `cyber-course-sync login`).");
  }
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}` },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "labs:publish", resource: api }),
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) throw new Error(`token request failed: ${res.status} ${JSON.stringify(body)}`);
  return body.access_token;
}

async function gql(api, token, query, variables) {
  const res = await fetch(`${api}/graphql`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/graphql-response+json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) throw new Error(`${query.trim().split("(")[0]} failed: ${JSON.stringify(body.errors ?? body)}`);
  return body.data;
}
