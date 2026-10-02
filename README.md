# cyber-course-sync

CLI that syncs a [Cyber Courses](https://www.cybercourses.com) content repo's
**structure** to [CyberBackend](https://cyberbackend.com). The MDX bodies stay in
the content repo (versioned in Git, private per course); the backend stores only
references (`contentRepo`/`contentPath`/`contentRef`) plus the skill mappings, and
runs the adaptive engine.

Maintained once, here, so a backend change never means editing every content repo.

## Usage

```bash
# From a content repo (reads ./course.json):
npx github:Cyber-Courses/cyber-course-sync sync
npx github:Cyber-Courses/cyber-course-sync sync --dry-run
```

In CI, a content repo's workflow is just:

```yaml
name: Sync to CyberBackend
on: { push: { branches: [main], paths: ["course.json", "content/**"] }, workflow_dispatch: {} }
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with: { node-version: "22" }
      - run: npx -y github:Cyber-Courses/cyber-course-sync sync
        env:
          CYBERAUTH_CLIENT_ID: ${{ secrets.CYBERAUTH_CLIENT_ID }}
          CYBERAUTH_CLIENT_SECRET: ${{ secrets.CYBERAUTH_CLIENT_SECRET }}
```

## Auth

One of:

- `CYBERAUTH_CLIENT_ID` + `CYBERAUTH_CLIENT_SECRET` — a Cyber Auth machine client
  with scope `labs:publish`, allowlisted in CyberBackend's `LAB_PUBLISHER_CLIENT_IDS`.
- `CYBERAUTH_ACCESS_TOKEN` — a token you already hold.
- `cyber-course-sync login` — interactive device-flow login for local authoring
  (planned).

## The `course.json` manifest

```jsonc
{
  "repo": "Cyber-Courses-Content/cyber-course-sqli",
  "lab": { /* PublishLabInput for a capstone lab, optional */ },
  "course": { "id": "course-sqli", "kind": "COURSE", "title": "...", "contains": ["lesson-..."] },
  "lessons": [
    { "lesson": { "id": "lesson-...", "kind": "LESSON", "contentPath": "content/en/....mdx", "contains": ["ex-...", "quiz-..."] },
      "extra": [ { "id": "ex-...", "kind": "EXERCISE", "targets": ["..."] } ] }
  ]
}
```

`contentRepo` is taken from `repo`; `contentRef` is the commit (`GITHUB_SHA`) in CI.
Idempotent: `publishLab` upserts by slug, `syncActivities` by id.
