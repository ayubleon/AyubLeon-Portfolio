# Original navigation backup

These 6 files are exact copies of the last **committed** (`git show HEAD:<file>`)
versions of the site's `.dc.html` pages, saved right before the project-viewer
modal feature (`project-viewer.js` — the layered card popup that opens when
you click a project) changed how clicking a project link behaves.

Clicking a project link in these versions does a normal, full page
navigation — no popup, no card carousel. This is how the site behaved before
this feature was added.

## To revert to this navigation

Copy any of these files back over the live one in the project root, e.g.:

```bash
cp "backup-original-navigation/BuzzIQ.dc.html" "../BuzzIQ.dc.html"
```

(run from inside this `backup-original-navigation` folder, or adjust the
path). Do this for whichever pages you want reverted, then also remove the
`<script src="project-viewer.js" defer></script>` tag from any page you
revert if you want the popup gone from it entirely — restoring these files
alone still leaves that script tag in place unless the file already predates
it (which these do).

Since git already tracks the committed version these were copied from, you
can alternatively just use `git checkout` or `git diff` against `HEAD` for
the same result — this folder exists purely as an easy, no-git-commands-needed
reference copy.
