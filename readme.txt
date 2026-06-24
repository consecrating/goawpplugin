=== GOA SEO Booster ===
Contributors: consecrating
Tags: seo, schema, structured data, open graph, performance, json-ld, local business, casino
Requires at least: 5.6
Tested up to: 6.5
Requires PHP: 7.2
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Lightweight technical SEO for WordPress: meta tags, JSON-LD structured data, Open Graph/Twitter cards, and front-end performance hints.

== Description ==

GOA SEO Booster is a focused, no-bloat SEO plugin built to improve search
visibility for content-light WordPress sites such as Casino Pride Goa
(cpofficial.in). It adds the technical SEO signals that search engines look for,
without the weight of large all-in-one suites.

**Modules (each can be toggled on/off):**

* **Meta tags** — Custom document title, meta description, canonical URL, and
  robots directives (auto noindex for search and 404 pages).
* **Open Graph & Twitter Cards** — Rich link previews on Facebook, X/Twitter,
  WhatsApp and LinkedIn, including image, title and description.
* **Structured data (JSON-LD)** — A single `@graph` containing:
    * `WebSite` with a Sitelinks SearchAction
    * `Organization` / `LocalBusiness` (configurable type, e.g. Casino) with
      address, geo coordinates, phone, logo, price range and social profiles
    * `WebPage` and `BreadcrumbList`
    * `FAQPage` built from your own Question | Answer list (home page)
* **Performance hints** — `preconnect` and `dns-prefetch` resource hints,
  deferred external JavaScript (jQuery preserved), native lazy-loading for
  images and iframes, and removal of the WordPress emoji script.

All output is escaped and all settings are sanitized. The plugin stores a single
option (`goa_seo_settings`) and cleans up after itself on uninstall.

== Why this plugin ==

A technical audit of the target site scored 61/100 (grade D), with the biggest
problems being a very slow Largest Contentful Paint (~12.6s), a heavy page
(~2.25 MB), and missing structured data. This plugin addresses the structured
data, meta, social and front-end performance gaps directly.

== Installation ==

1. Upload the `goawpplugin` folder to `/wp-content/plugins/` (or install the ZIP
   via Plugins > Add New > Upload Plugin).
2. Activate the plugin through the **Plugins** menu in WordPress.
3. Go to **Settings > GOA SEO Booster** and fill in your business details, FAQ
   items and social profiles.
4. Validate your structured data with Google's
   [Rich Results Test](https://search.google.com/test/rich-results).

== Frequently Asked Questions ==

= Does this conflict with Yoast or Rank Math? =

To avoid duplicate tags, disable overlapping modules (meta, Open Graph,
structured data) in either this plugin or your existing SEO plugin.

= How do I add FAQ entries? =

On the settings page, add one entry per line in the format `Question | Answer`.
These render as FAQPage structured data on the home page.

= Will deferring JavaScript break my theme? =

jQuery and its dependencies are never deferred. If a specific script needs to
load early, use the `goa_seo_defer_skip` filter to exclude its handle.

== Developer Filters ==

* `goa_seo_meta_description` — Filter the resolved meta description.
* `goa_seo_canonical` — Filter the canonical URL.
* `goa_seo_robots` — Filter the robots directive.
* `goa_seo_open_graph_data` — Filter the Open Graph data array.
* `goa_seo_schema_graph` — Filter the full JSON-LD `@graph` before output.
* `goa_seo_defer_skip` — Filter the list of script handles never deferred.

== Changelog ==

= 1.0.0 =
* Initial release: meta tags, Open Graph/Twitter cards, JSON-LD structured data
  (WebSite, LocalBusiness, WebPage, BreadcrumbList, FAQPage), performance hints,
  and a tabbed settings page.

== Upgrade Notice ==

= 1.0.0 =
First release.
