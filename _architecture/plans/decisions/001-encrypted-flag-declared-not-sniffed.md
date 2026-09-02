# Decision 001 — encrypted flag declared, not sniffed

Date: 2026-09-02

Status: DECIDED

## Problem

A document's `encrypted` flag was set by guessing. On save, the page asked whether the draft
*looked* like base64 and persisted the answer; on render, that flag decided whether to decrypt.
The guess misfired in both directions — plain content that happens to be valid base64 was
stored as ciphertext and then rendered as garbage.

The guess was also load-bearing rather than incidental: the app never encrypts anything, so it
was the only mechanism by which a document was ever marked encrypted. Deleting it without a
replacement would have stopped encrypted notes rendering at all.

## Options considered

1. Explicit toggle in the editor, sending a declared boolean on save.
2. A server-side encryption endpoint the client POSTs plaintext to.
3. Encrypt in-app on save, keeping the key client-side.
4. Separately: replace XOR-against-username with WebCrypto AES-GCM and a real passphrase.

## Decision

Option 1. A toolbar toggle sets the flag; the page sends what the user declared. The sniffing
helper is deleted. Option 4 was declined — the algorithm stays XOR + base64url, understood as
obfuscation.

## Why not the alternatives

Option 2 inverts the property worth protecting. Today the API never receives plaintext for an
encrypted note: it is encrypted offline via `encrypt-util.html` and pasted in as ciphertext, so
the server stores bytes it cannot read. An encryption endpoint would mean POSTing plaintext for
the server to encrypt, which protects only the SQLite file at rest. Since `data/notes.sqlite`
lives on the same host as the API, that buys little and costs a real guarantee. It also needs
somewhere to hold a server-side key, which a single-user POC has no good answer for.

Option 3 is a reasonable future step — it would retire the manual copy-paste round trip without
giving the server plaintext — but it changes the save path more than the flag bug required, and
the flag bug is what was actually broken.

Option 4 was declined on threat model, not effort. The key is the login name, which is not
secret, so this was never confidentiality. What it does defend against — someone glancing at
the screen or scrolling browser history — it already does. Calling it encryption in the UI
would have been the actual problem, so the toggle's wording describes state ("content is
encrypted") rather than promising protection.

## Next step

None required. If real confidentiality is ever wanted, option 4 is the path, and it needs a
migration plan: existing XOR notes become unreadable under a new scheme unless decrypted and
re-encrypted first.
