# Specification

## Summary
**Goal:** Fix the "File not found" error that occurs when accessing uploaded files via their share links.

**Planned changes:**
- Investigate and fix the backend file storage and retrieval flow to ensure uploaded files are immediately accessible via share links
- Verify that file metadata and chunks are correctly stored in the persistent maps during upload
- Ensure share link generation uses the correct file ID format that matches the backend storage
- Fix public file access permissions to allow anonymous users to view shared files without authentication errors

**User-visible outcome:** Users can successfully access and view uploaded files via share links immediately after upload, without encountering "File not found" errors.
