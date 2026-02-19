# Specification

## Summary
**Goal:** Fix the "Actor not available" error that prevents file uploads after favicon implementation.

**Planned changes:**
- Diagnose and resolve backend actor initialization issue causing "Actor not available" error
- Restore file picker upload functionality for images and videos (max 2MB)
- Ensure chunked upload process works correctly for authenticated users
- Verify uploaded files display in UI with shareable links after fix
- Maintain favicon display in browser tab while ensuring uploads work

**User-visible outcome:** Users can successfully select and upload image/video files (up to 2MB) through the file picker, see them in My Uploads with shareable links, while the favicon continues to display in the browser tab.
