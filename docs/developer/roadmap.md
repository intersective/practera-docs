<!-- status: living -->

# Internal roadmap

The working roadmap is the Next.js app in `roadmap/` of this repository. It keeps objectives, initiatives, gap analysis, AI prioritisation, and Jira and GitHub sync.

| Audience | Where | What they see |
|----------|--------|----------------|
| Customers | [What’s coming](https://support.practera.com/whats-coming/) on the Support Centre | A provisional summary, coarse status, and quarter |
| Internal teams | [roadmap.practera.com](https://roadmap.practera.com) | The full app, including Jira, GitHub, assignees, and effort |

`roadmap.practera.com` is behind Cloudflare Access for the `intersective` GitHub organisation. Setup steps are in [Cloudflare / Auth Setup](cloudflare-setup.md). Locally the app is `https://roadmap.practera.local`.

The public page is a generated subset. It does not include assignees, effort, impact, AI scores, Jira keys, GitHub milestones, gaps, or the internal description.

## Publish the customer page

1. On an initiative, write a **customer summary** and turn on **Show on the public What’s coming page**.
2. Check **Customer preview** in the app. Visible items with an empty summary, and cancelled items, are listed there and are left out of the page.
3. From `roadmap/`, run `npm run publish:customer`.
4. Review the diff in `docs/whats-coming.md`, commit it, and deploy the Support Centre from `release/live`.

The public page is explicitly provisional. Dates and scope are not a commitment.

Strategic competitive analysis stays in the Support Centre under Platform → Strategic Roadmap. That document is not this delivery roadmap.
