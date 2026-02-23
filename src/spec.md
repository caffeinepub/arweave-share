# Specification

## Summary
**Goal:** Increase file upload limit to 20MB and add a warning for large files.

**Planned changes:**
- Increase maximum file upload size from 2MB to 20MB for all file types
- Update backend to handle files up to 20MB with existing chunk mechanism
- Add warning message when users select files larger than 15MB
- Update UI text to display new 20MB limit

**User-visible outcome:** Users can upload files up to 20MB with a helpful warning for larger files, seeing the updated size limit on the upload page.
