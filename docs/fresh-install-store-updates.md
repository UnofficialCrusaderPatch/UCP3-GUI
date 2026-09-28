# Store updates during a fresh installation

After extracting a framework archive into a folder without an existing `ucp`
directory or `ucp-config.yml`, the installer requests that framework's Store.
It resolves compatible stable updates for bundled extensions, including their
dependencies. Existing installations skip this step. Versions are selected
semantically; no specific framework or extension release is hardcoded.

The plan contains only the selected binary download source. Automatic module
updates require a source with a signature; its URL, hash and signature stay
together through the existing installer. This does not add cryptographic
signature verification to the GUI: the existing module installation writes the
signature alongside the archive, and the framework enforces module signatures.

Successful downloads alone do not permit pruning. The installer rediscovers
extensions from the target folder and requires every planned name, version and
type to load successfully. Packaged dependencies must match the normalized Store
dependencies. The dependency resolver then validates the installed candidate set
with the replacements pinned, excluding bundled versions about to be removed.

Any failure before pruning removes the newly introduced versions and preserves
the original bundle for fallback. A rollback failure fails installation before
activation, since a clean fallback cannot be assumed. After validation, failure
to remove an old bundle is logged; new versions are retained. Developer module
source directories are preserved; pruning only removes old module ZIPs and their
signatures, and superseded plugin directories.

Automated coverage includes source ordering and hash checks through the actual
planner/downloader, missing or mismatched installed definitions, changed
dependencies, incompatible surviving bundles, rollback failures, explicit target
folders, and skipping existing installations. Native acceptance should cover a
fresh online installation and an offline/failing-download installation, then
reopen the GUI and verify the selected extensions and configuration.
