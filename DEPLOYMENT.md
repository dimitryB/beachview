# Deploying VABeachCast to GitHub Pages

VABeachCast is a static Vite application. The repository includes a GitHub
Actions workflow that waits for CI to pass, builds with the correct Pages base
path, uploads only `dist/`, and deploys that artifact to GitHub Pages.

No application secrets, backend, or paid service are required.

## 1. Create the GitHub repository

This local checkout does not currently have a Git remote. In GitHub:

1. Select **New repository**.
2. Name it `beachview` (or another name you prefer).
3. Choose **Public** if you are using GitHub Pages with a free personal
   account.
4. Do not initialize it with a README, `.gitignore`, or license because those
   files already exist locally.
5. Create the repository and copy its HTTPS URL.

Then connect and push this checkout:

```sh
cd /Users/dbur/Documents/beachview
git status
git remote add origin https://github.com/YOUR_USERNAME/beachview.git
git push -u origin main
```

If an `origin` remote is added later but points to the wrong repository, update
it instead:

```sh
git remote set-url origin https://github.com/YOUR_USERNAME/beachview.git
git remote -v
```

## 2. Select GitHub Actions as the Pages source

In the GitHub repository:

1. Open **Settings → Pages**.
2. Under **Build and deployment**, select **GitHub Actions** as the source.
3. Return to the **Actions** tab.

The push to `main` starts `CI`. After both CI jobs pass,
`Deploy GitHub Pages` builds and publishes the same verified revision. The
workflow has only the permissions GitHub Pages requires: read repository
contents, write Pages, and request an OIDC identity token.

For a repository named `beachview`, the expected project-site URL is:

```text
https://YOUR_USERNAME.github.io/beachview/
```

The workflow automatically uses `/beachview/` as Vite's base path. A repository
named `YOUR_USERNAME.github.io` is treated as a user site and automatically
uses `/`.

## 3. Wait for the deployment

In **Actions**:

1. Open the latest `CI` run and confirm the `quality` and `browser` jobs pass.
2. Open the subsequent `Deploy GitHub Pages` run.
3. Confirm its `build` and `deploy` jobs pass.
4. Open the URL shown in the `github-pages` deployment environment.

You can also start a deployment manually from
**Actions → Deploy GitHub Pages → Run workflow**. A manual deployment repeats
the core formatting, lint, type, and unit checks before building.

If a deployment does not start, confirm that the default branch is named
`main`, the CI workflow is enabled, and Pages uses the GitHub Actions source.

## 4. Enable HTTPS

After the first successful deployment, return to **Settings → Pages** and
enable **Enforce HTTPS** if GitHub does not enable it automatically. Wait for
GitHub's certificate to finish provisioning if the option is temporarily
unavailable.

## 5. Run the production smoke check

From this checkout, use the exact URL GitHub reports:

```sh
npm run smoke:deployment -- https://YOUR_USERNAME.github.io/beachview/
```

The check verifies:

- HTTPS for non-local sites
- The HTML application shell
- Hashed JavaScript and CSS assets under the configured base path
- A direct `?view=fishing` URL
- That the HTML shell is not marked immutable

Then manually open both views and refresh each page:

```text
https://YOUR_USERNAME.github.io/beachview/?view=swimming
https://YOUR_USERNAME.github.io/beachview/?view=fishing
```

Confirm that:

1. Both views load on mobile and desktop.
2. Open-Meteo modeled values use metric units and Eastern timestamps.
3. NOAA tide values are labeled predictions and interpolated heights are
   labeled estimates.
4. Source, attribution, NWS, VDH, and NOAA links open.
5. A clean browser profile receives live data.
6. Offline mode retains saved values only with stale/offline language.
7. The first displayed high/low events agree with the
   [official NOAA Sandbridge prediction page](https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=8639428)
   using station `8639428`, datum `MLLW`, and metric units.
8. Keyboard navigation, a screen reader, and `200%` browser zoom remain usable.

The release checklist is in
[Testing and operations](TESTING_AND_OPERATIONS.md#11-deployment-checklist).

## Base-path overrides and custom domains

Normally no repository variable is needed. The deployment workflow derives the
right base path from the repository name.

Set an Actions repository variable named `VITE_BASE_PATH` only when the public
path differs:

1. Open **Settings → Secrets and variables → Actions → Variables**.
2. Add `VITE_BASE_PATH`.
3. Use `/` for a custom domain served at its root, or `/some-prefix/` for an
   unusual prefixed route.
4. Run the Pages workflow again.

For a custom domain, also configure the domain in **Settings → Pages** and
follow GitHub's DNS instructions. A base-path variable does not configure DNS
or the Pages domain by itself.

## Cache behavior

Vite adds content hashes to built JavaScript and CSS filenames, so changed
assets receive new URLs. GitHub Pages owns the response-header configuration;
this project does not add unsupported custom-header files. The deployment smoke
test fails if the host marks the HTML shell as immutable.

## Roll back a release

Revert the problem commit and push the revert to `main`:

```sh
git log --oneline -5
git revert BAD_COMMIT_SHA
git push origin main
```

CI and Pages will publish the reverted revision. Do not force-push or manually
copy files into a publishing branch.

## Routine maintenance

- Dependabot checks npm packages and GitHub Actions weekly.
- `Live provider smoke` checks Open-Meteo and NOAA contracts on the first day
  of every month and can also be run manually.
- Review product thresholds and official safety links before each swimming
  season.
- Record production releases and provider-term reviews in [RELEASES.md](RELEASES.md).

## Official references

- [GitHub Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub Pages HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
- [Vite static deployment and base paths](https://vite.dev/guide/static-deploy)
