# Specification

## Summary
**Goal:** Rebuild the media sharing application to use ICP chunked storage instead of Arweave, supporting images and videos up to 2MB with private uploads and public shareable links.

**Planned changes:**
- Remove all Arweave integration (KeyfilePicker component, arweaveClient.ts, and related logic)
- Implement chunked file upload in backend for files up to 2MB, storing in stable storage with automatic reassembly
- Update UploadPage to upload directly to ICP backend with progress bar showing upload percentage
- Ensure uploaded files are private to uploader by default, only visible in their uploads list
- Generate unique shareable links for each file that allow public download without authentication
- Update MyUploadsPage to show thumbnails, file sizes, upload dates, and copy-to-clipboard share link buttons

**User-visible outcome:** Users can upload images and small videos (up to 2MB) directly to ICP storage with a progress indicator, view their private media library with thumbnails and metadata, and generate shareable links that anyone can use to download files without logging in.
