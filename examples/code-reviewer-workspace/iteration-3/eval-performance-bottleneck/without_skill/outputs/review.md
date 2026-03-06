## Review

The main issue is the N+1 query problem — database queries inside loops. Use
JOINs instead.

Also:

- Add error handling (try/catch)
- Consider pagination for large result sets
- The code is functional but won't scale
