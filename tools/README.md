# Vendored BASS runtime

`bass-platform-0.2.1.tgz` is the complete BASS package built from the exact
source branch and commit recorded in `../harness.lock.json`. The package keeps
the NAN runtime available, while this project activates the `common`, `web`,
and `server` profiles.

When upgrading BASS, review the source commit first, pack that exact checkout,
then update the tarball, `harness.lock.json`, `package.json`, and
`package-lock.json` together. `npm run setup:agent` refuses to run if the
tarball SHA-256 does not match the lock.
