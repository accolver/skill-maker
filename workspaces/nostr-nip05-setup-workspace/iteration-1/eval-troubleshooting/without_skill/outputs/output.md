# Fixing Your NIP-05 Verification

I can see a few issues with your setup. Let me go through them.

## Issue 1: The Redirect

The 301 redirect from `mydomain.com` to `www.mydomain.com` is a problem. NIP-05
clients may not follow redirects properly. You should configure your server to
serve the nostr.json file directly from `mydomain.com` without redirecting.

Check your Nginx or web server config and remove the redirect for that path, or
serve the file from both domains.

## Issue 2: The Public Key Format

You're using an npub-format key in your nostr.json. You should convert this to
hex format instead. Use a Nostr key conversion tool to convert your npub to hex.

Your corrected nostr.json should look like:

```json
{
  "names": {
    "Alice": "<hex-pubkey-here>"
  }
}
```

## Issue 3: Case Sensitivity

The name "Alice" with a capital A might cause issues. Some clients may be
case-sensitive. Consider using lowercase "alice" instead for better
compatibility.

Update your profile to use `alice@mydomain.com` as well.

## Testing

After making these changes, test by visiting:

```
https://mydomain.com/.well-known/nostr.json
```

in your browser to make sure the JSON is returned correctly.
