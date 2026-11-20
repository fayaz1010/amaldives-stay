# Vayves SEO approach: decision memo

For: Fayaz · Date: 2026-11-21 · Oz job pxp39m · Research only, no code changed.

Follows `docs/VAYVES-SEO-ROADMAP.md` (2026-07-07). That roadmap's ten landing pages are now
live, so this memo is about what happened next and what to do about it.

## Decision needed

**Approve a "get indexed first, then publish weekly" plan**: one week of fixes so Google
actually indexes the pages we already have, then four pages or articles a week aimed at the
Maldives market, where the search results are winnable.

The reason is one finding. Search Console URL Inspection (2026-11-21) reports **every
marketing page as "Discovered - currently not indexed", never crawled**: `/maldives`,
`/mira-tax`, `/free`, `/little-hotelier-alternative`, `/channel-manager`, `/small-hotels`,
`/direct-booking`, `/vs-cloudbeds`, `/for-guesthouses` and the one blog article. Only the home
page, `/claim` and a few tenant subdomains get impressions: 61 impressions and 10 clicks in
90 days, none for a software keyword. vayves.com ranks for none of the 20 keywords checked.

So the bottleneck is not missing pages. Publishing more pages onto a domain Google is not
crawling would add to the backlog, not to traffic.

## 1. Where things stand

| Item | Finding | Source |
|---|---|---|
| Indexing | 10 of 10 inspected marketing URLs not indexed, no crawl date | GSC URL Inspection |
| Search traffic | 61 impressions, 10 clicks in 90 days, all brand or tenant-name queries | GSC, 22 Aug to 19 Nov 2026 |
| Rankings | Not in the top 10 for any of 20 target keywords | Live SERPs, 2026-11-21 |
| Page depth | Landing pages render about 420 to 720 words; the roadmap briefs asked for 1,400 to 1,800 | Live fetch |
| Home page | No structured data | Live fetch |
| `/for-guesthouses` | Title still says "stay by aMaldives", no canonical tag | Live fetch |
| Blog | One article (1,808 words, published 2026-10-14), not indexed | HQ article feed |
| Pricing shown | 30-day trial, $19, $49 and $79 a month | Live home page |

Likely causes of the indexing gap, in order: a young domain with almost no external links, so
Google has little reason to spend crawl on it; pages thinner than what already ranks; weak
internal linking from the home page to the landing pages. None of these is confirmed as the
single cause. Week 1 tests them.

## 2. Target segments and markets

| Priority | Segment | Market | Why |
|---|---|---|---|
| 1 | Local-island guesthouses, 5 to 30 rooms | Maldives | Live customers, a working TGST and Green Tax module, amaldives.com as a demand channel no rival has. Results pages are held by small local vendors, not global brands. |
| 2 | Small city hotels and boutique hotels | Maldives (Malé, Hulhumalé, Addu) | Same tax and payment needs, same pages serve them. |
| 3 | Guesthouses and small hotels | Sri Lanka | Closest look-alike market. Local results are also held by small vendors (myhotelina, Neo Hotelier) plus eZee and Hotelogix country pages. Only worth it once the product handles Sri Lankan tax and payments. |
| 4 | Guesthouses, B&Bs, small hotels under 50 rooms | Global English | Held by Cloudbeds, Little Hotelier, Guesty and review directories. Target only through "alternative" and comparison pages, not head terms. |

Not targeted: resorts with complex operations (Opera territory), vacation-rental managers
(Guesty and Hostaway territory), and head terms such as "hotel management software".

## 3. Priority keywords

Search volumes are not available: no keyword-volume provider is configured (DataForSEO
credentials are missing) and Search Console has no history. The order below is by buying
intent and by how beatable the current first page is, not by volume. Every one of these is a
small-volume keyword; the bet is on conversion, not traffic.

| # | Keyword | Intent | Market | Page | State | Winnable? |
|---|---|---|---|---|---|---|
| 1 | guest house software Maldives | Buy | MV | `/maldives` | Live, not indexed | Yes: Fenuva, eZee, Qvian, Lushware |
| 2 | guesthouse management software Maldives | Buy | MV | `/maldives` | Live, not indexed | Yes |
| 3 | hotel management software Maldives | Buy | MV | `/maldives` | Live, not indexed | Yes |
| 4 | hotel PMS Maldives | Buy | MV | `/maldives` | Live, not indexed | Yes |
| 5 | TGST Green Tax software Maldives | Buy | MV | `/mira-tax` | Live, not indexed | Yes: Fenuva, LobbyMind, MIRA itself |
| 6 | MIRA Green Tax return guesthouse | Research to buy | MV | `/mira-tax` plus guide | Guide to write | Yes |
| 7 | Maldives Guest Information System (MGIS) guesthouse | Research | MV | New guide | To write | Yes: launched 1 Oct 2026, few pages cover it |
| 8 | channel manager Maldives | Buy | MV | `/channel-manager` | Live, not indexed | Yes |
| 9 | booking engine for guesthouses Maldives | Buy | MV | `/direct-booking` | Live, not indexed | Yes |
| 10 | BML payment gateway hotel booking | Buy | MV | `/payments-maldives` | Live | Yes |
| 11 | Fenuva alternative | Compare | MV | New `/fenuva-alternative` | To build | Yes: no one targets it |
| 12 | eZee Absolute alternative | Compare | MV, LK, IN | New `/ezee-absolute-alternative` | To build | Medium |
| 13 | Little Hotelier alternative | Compare | Global | `/little-hotelier-alternative` | Live, not indexed | Hard: directories and an AI Overview, but small vendors (Tribii, FluxPMS, Sticky Guest) do rank |
| 14 | Cloudbeds alternative for small hotels | Compare | Global | `/vs-cloudbeds` | Live, not indexed | Hard |
| 15 | eviivo alternative | Compare | Global, UK | New `/eviivo-alternative` | To build | Medium |
| 16 | PMS for guesthouses | Buy | Global | `/for-guesthouses` | Live, wrong title | Hard: Microsoft Store, Hotel Tech Report, Infor, Oracle |
| 17 | guesthouse management software | Buy | Global | `/for-guesthouses` | Live, wrong title | Hard: Cloudbeds, Guesty, Little Hotelier |
| 18 | PMS for small hotels | Buy | Global | `/small-hotels` | Live, not indexed | Hard |
| 19 | free hotel PMS | Buy | Global | `/free` | Live, not indexed | Hard, and we offer a trial, not a free plan |
| 20 | guesthouse management software Sri Lanka | Buy | LK | New `/sri-lanka` | Later | Medium |
| 21 | hotel PMS Sri Lanka | Buy | LK | New `/sri-lanka` | Later | Medium |
| 22 | how to start a guesthouse in Maldives | Research | MV | New guide | To write | Yes, and it reaches owners before they pick software |

Rows 1 to 11 are the plan for the next four weeks. Rows 13 to 19 already have pages; they
need indexing and depth, not new builds.

One conflict to settle: `/free` targets "free hotel PMS" but the product is a 30-day trial.
Competitor Tribii offers a real free tier up to 20 rooms. Either add a free tier or retarget
the page to "free trial" terms.

## 4. The three competitors that rank, and why

**Fenuva (fenuva.cloud): the one to beat.** Position 1 for "guest house software Maldives"
and for "TGST green tax software Maldives", position 4 for "hotel management software
Maldives". It ranks because it has one page per need (a Maldives guesthouse page, a tax
software page, a TGST and Green Tax guide), the exact keyword in each title, a visible price
($39 a month), and it is Maldives-built. Vayves undercuts it at $19 and has the amaldives.com
demand channel, but has none of this indexed.

**eZee Absolute (ezeeabsolute.com): the country-page template.** Position 1 for "hotel
management software Maldives", position 2 for the guesthouse term, position 4 for "hotel PMS
Sri Lanka". It ranks on domain age and authority with one templated landing page per country.
The pages are generic: no MIRA detail, no local payments. That is the gap a specific page
can beat.

**Little Hotelier (littlehotelier.com): the global segment owner.** Position 3 for
"guesthouse management software" with a dedicated `/guest-house-software/` page, and the
product Google's AI Overview names for small properties. It ranks on brand, links, and a
page per property type. Not beatable head-on; use it as the anchor for comparison pages.

Also on the Maldives first page and worth watching: Qvian, Frontdesko, Lushware, Acuity
(abs.com.mv), LobbyMind. Globally, Hotel Tech Report appears for 12 of the 20 keywords and
Capterra and G2 feed the AI Overviews: being listed there matters more than outranking them.

## 5. Page types to build

| Type | Purpose | Existing | Add |
|---|---|---|---|
| Location | Local buying intent | `/maldives` | Deepen `/maldives`; later `/sri-lanka`. Atoll or island pages only if each carries real local detail (transfers, named customers); otherwise skip. |
| Comparison | Buyers switching or shortlisting | `/little-hotelier-alternative`, `/vs-cloudbeds` | `/fenuva-alternative`, `/ezee-absolute-alternative`, `/eviivo-alternative`. One honest table each: price, channel manager, tax module, local payments, free tier. |
| Feature | Buyers searching by need | `/mira-tax`, `/channel-manager`, `/direct-booking`, `/payments-maldives` | A pricing page (pricing currently lives only as a home-page section), an online check-in page. |
| Segment | Buyers searching by property type | `/for-guesthouses`, `/small-hotels`, `/resorts` | Fix `/for-guesthouses` first. |
| Guide (blog) | Owners with a tax or operations question; builds links and trust | One article | MGIS, Green Tax return, TGST, starting a guesthouse, cutting OTA commission. |

Rules for every page: a real screenshot, a named live property where the owner agrees,
current tax rates with the date and a MIRA link, FAQ markup, one call to action. Competitor
facts must be checked on the day and dated.

## 6. Four-week plan

Four items a week. Guides go through the HQ article feed; pages go through pull requests.

**Week 1: get indexed (no new pages)**
1. Request indexing in Search Console for the ten URLs and resubmit the sitemap.
2. Fix `/for-guesthouses`: title, description, canonical. Add Organization and
   SoftwareApplication markup to the home page.
3. Link every landing page from the home page body and footer, and from the blog article.
   Add links from amaldives.com (owner-facing "list your guesthouse" spots) to `/maldives`
   and `/for-guesthouses`.
4. Deepen `/maldives` and `/mira-tax` to the roadmap's brief (1,500 and 1,800 words, tables,
   worked tax example, screenshots).

**Week 2: the tax moat**
1. Guide: "Maldives Guest Information System (MGIS): what guesthouses must do".
2. Guide: "How to file a Green Tax return for a guesthouse", with a worked example.
3. Guide: "TGST for guesthouses: rates, invoices and due dates".
4. Page: `/fenuva-alternative`.

**Week 3: comparisons and listings**
1. Page: `/ezee-absolute-alternative`.
2. Page: `/eviivo-alternative`; deepen `/little-hotelier-alternative` and `/vs-cloudbeds`.
3. Page: pricing.
4. Draft listing profiles for Capterra, G2, Hotel Tech Report and SoftwareAdvice. Submitting
   them creates accounts and posts publicly, so that step needs Fayaz.

**Week 4: owner guides and review**
1. Guide: "How to start a guesthouse in the Maldives: licences, costs, software".
2. Guide: "Booking.com commission in the Maldives and how to cut it with direct bookings".
3. Guide: "Channel manager or iCal sync: what a small guesthouse actually needs".
4. Review: index status of every URL, impressions per page, rank for keywords 1 to 11.
   Decide whether Sri Lanka is next.

**Go or no-go at the end of week 4:** if `/maldives` and `/mira-tax` are still not indexed
after the week 1 fixes, stop publishing and work on links (directory listings, Maldives
business and tourism sites, guest-house association) before anything else.

## 7. The seo-registry entry

No seo-registry file or schema was found in this repo, in `ozsystems`, or in `oz-mono`, so
the fields below are a proposal to adapt to the real registry format.

Vayves has two content paths, so the adapter has two modes.

```yaml
site: vayves.com
project: Vayves
track: growth
repo: fayaz1010/amaldives-stay          # the catalog's fayaz1010/vayves URL does not exist
local_path: ~/dev/amaldives-stay
gsc_property: sc-domain:vayves.com
ga4_measurement_id: G-04P06J8Z99
sitemap: https://vayves.com/sitemap.xml

adapter:
  articles:                             # guides and blog posts
    kind: hq-feed
    generate: AT content_eeat_generate (keyword plan, allowed links, wedge, CTA)
    save: POST https://www.ozsystems.com.au/api/agent/report
          type blog_article, domain vayves.com, status draft then published
    read: lib/blog.ts fetches /api/public/articles?domain=vayves.com (ISR, 1 hour)
    url_pattern: https://vayves.com/blog/{slug}
    repo_change: none
    sitemap: automatic (app/sitemap.ts reads the feed)
  pages:                                # location, comparison, feature, segment pages
    kind: repo-route
    generate: React route at app/{slug}/page.tsx with metadata, canonical, FAQ markup
    save: commit on a branch, pull request to main
    url_pattern: https://vayves.com/{slug}
    sitemap: manual, add the route to app/sitemap.ts in the same pull request

deploy:
  articles: none needed, live within an hour of publish in HQ
  pages: merge to main, Vercel git deploy (project amaldives-stay)
  never: vercel --prod from the CLI (see docs/VAYVES-MIGRATION.md)

after_publish:
  - AT seo_content_track (URL, keywords, date)
  - GSC URL Inspection, request indexing
  - report to HQ: blog_article for guides, deployment for pages, seo_snapshot weekly

guardrails:
  - never brand the product "Stay"
  - tax rates dated and linked to MIRA; no tax advice
  - competitor facts checked on the day; no disparagement
  - name a customer property only with the owner's consent
  - a human approves before status moves to published
cadence: 4 items a week
```

Two things to fix alongside the registry entry: `live-apps-catalog.ts` in `ozsystems` lists
the repo as `fayaz1010/vayves`, and `stripe-project-map.ts` lists the local path as
`D:\vayves`. Neither exists on this machine.

## 8. What was not checked

- Search volumes (no provider configured). Adding DataForSEO would let the keyword order be
  checked against demand.
- Backlink counts for Vayves or competitors.
- Why Google has not crawled the pages; the causes in section 1 are the likely ones, not
  confirmed ones.
- Competitor prices beyond what their search snippets state.
- SERPs were read from a Chrome session with country set to MV, LK or US; positions vary by
  user and day.
