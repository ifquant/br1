use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LibraryBookRecord {
    pub(crate) id: String,
    pub(crate) title: String,
    pub(crate) author: String,
    pub(crate) format: String,
    pub(crate) description: Option<String>,
    pub(crate) language: Option<String>,
    pub(crate) publisher: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) collection: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub(crate) tags: Vec<String>,
    pub(crate) progress: String,
    pub(crate) status: String,
    pub(crate) file_path: String,
    pub(crate) cover_path: Option<String>,
    pub(crate) source_path: Option<String>,
    pub(crate) imported_at: u64,
    pub(crate) progress_fraction: Option<f64>,
    pub(crate) progress_location: Option<String>,
    pub(crate) last_opened_at: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) library_file_exists: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) source_file_exists: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReadestLibrarySummary {
    pub(crate) available: bool,
    pub(crate) count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReadestImportResult {
    pub(crate) records: Vec<LibraryBookRecord>,
    pub(crate) total_detected: usize,
    pub(crate) imported_count: usize,
    pub(crate) replaced_count: usize,
    pub(crate) skipped_missing_files: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LibraryRepairCandidatePreview {
    pub(crate) file_path: String,
    pub(crate) file_name: String,
    pub(crate) format: String,
    pub(crate) title: String,
    pub(crate) author: String,
    pub(crate) byte_size: Option<u64>,
    pub(crate) sha256: Option<String>,
    pub(crate) format_matches: bool,
    pub(crate) title_matches: bool,
    pub(crate) author_matches: bool,
    pub(crate) source_path_matches: bool,
    pub(crate) source_hash_matches: bool,
    pub(crate) file_exists: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReadestBookRecord {
    pub(crate) hash: String,
    pub(crate) format: String,
    pub(crate) title: String,
    pub(crate) author: String,
    pub(crate) metadata: Option<serde_json::Value>,
    pub(crate) created_at: Option<u64>,
    pub(crate) downloaded_at: Option<u64>,
    pub(crate) progress: Option<Vec<u64>>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReadestBookConfig {
    pub(crate) location: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReadestBookMetadata {
    pub(crate) description: Option<String>,
    pub(crate) publisher: Option<serde_json::Value>,
    pub(crate) language: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LibraryBookBinary {
    pub(crate) name: String,
    pub(crate) mime_type: String,
    pub(crate) bytes_base64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AssociatedBookOpenRequest {
    pub(crate) path: String,
    pub(crate) label: String,
}

#[derive(Default)]
pub(crate) struct PendingAssociatedBookOpenRequests(
    pub(crate) Mutex<Vec<AssociatedBookOpenRequest>>,
);

#[derive(Default)]
pub(crate) struct AssociatedBookOpenDiagnostics(pub(crate) Mutex<Vec<String>>);

#[derive(Default)]
pub(crate) struct TrustedAssociatedBookOpenPaths(pub(crate) Mutex<HashSet<String>>);

#[derive(Default)]
pub(crate) struct TrustedLibraryImportPaths(pub(crate) Mutex<HashSet<String>>);

#[derive(Default)]
pub(crate) struct RemovedLibraryBookRecords(pub(crate) Mutex<HashMap<String, LibraryBookRecord>>);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReaderSearchCacheExcerpt {
    pub(crate) pre: String,
    #[serde(rename = "match")]
    pub(crate) match_text: String,
    pub(crate) post: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReaderSearchCacheResult {
    pub(crate) cfi: String,
    pub(crate) label: String,
    pub(crate) excerpt: ReaderSearchCacheExcerpt,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReaderSearchCacheEntry {
    pub(crate) schema_version: u8,
    pub(crate) saved_at: u64,
    pub(crate) last_accessed_at: u64,
    pub(crate) expires_at: u64,
    pub(crate) results: Vec<ReaderSearchCacheResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReaderBookmarkRecord {
    pub(crate) id: String,
    pub(crate) locator: String,
    #[serde(default)]
    pub(crate) target_href: String,
    pub(crate) chapter_label: String,
    pub(crate) chapter_href: String,
    pub(crate) progress_label: String,
    pub(crate) location_label: String,
    pub(crate) created_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReaderBookmarksEntry {
    pub(crate) schema_version: u8,
    pub(crate) bookmarks: Vec<ReaderBookmarkRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReaderNoteRecord {
    pub(crate) id: String,
    #[serde(default = "default_reader_note_kind")]
    pub(crate) kind: String,
    pub(crate) cfi: String,
    pub(crate) text: String,
    pub(crate) note: String,
    pub(crate) chapter_label: String,
    pub(crate) chapter_href: String,
    pub(crate) created_at: u64,
}

fn default_reader_note_kind() -> String {
    "note".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReaderNotesEntry {
    pub(crate) schema_version: u8,
    pub(crate) notes: Vec<ReaderNoteRecord>,
}

#[derive(Debug, Clone)]
pub(crate) struct ReaderSearchCacheFileInfo {
    pub(crate) path: PathBuf,
    pub(crate) modified_ms: u64,
}

#[derive(Debug, Clone, Default)]
pub(crate) struct ReadestBookMetadataSummary {
    pub(crate) description: Option<String>,
    pub(crate) language: Option<String>,
    pub(crate) publisher: Option<String>,
}

pub(crate) const READER_SEARCH_CACHE_SCHEMA_VERSION: u8 = 1;
pub(crate) const READER_SEARCH_CACHE_TTL_MS: u64 = 1000 * 60 * 60 * 24 * 7;
pub(crate) const READER_SEARCH_CACHE_MAX_FILES_PER_BOOK: usize = 48;
pub(crate) const READER_SEARCH_CACHE_MAX_FILES_TOTAL: usize = 512;
pub(crate) const READER_BOOKMARKS_SCHEMA_VERSION: u8 = 1;
pub(crate) const READER_NOTES_SCHEMA_VERSION: u8 = 1;
pub(crate) const READER_HIGHLIGHTS_WORKSPACE_SCHEMA_VERSION: u8 = 3;
pub(crate) const BR1_SYNC_SNAPSHOT_SCHEMA_VERSION: u8 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReaderHighlightsSelectionImportRecord {
    pub(crate) book_key: String,
    pub(crate) book_title: String,
    pub(crate) format_label: String,
    pub(crate) selection_name: String,
    pub(crate) matched_count: u64,
    pub(crate) total_count: u64,
    pub(crate) unmatched_count: u64,
    pub(crate) imported_at: u64,
    #[serde(default)]
    pub(crate) highlights: Vec<ReaderNoteRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReaderHighlightsSelectionSetRecord {
    pub(crate) id: String,
    pub(crate) name: String,
    pub(crate) selected_ids: Vec<String>,
    pub(crate) created_at: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) import_source: Option<ReaderHighlightsSelectionImportRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReaderHighlightsWorkspaceStateRecord {
    #[serde(default = "default_reader_highlights_filter")]
    pub(crate) filter: String,
    #[serde(default = "default_reader_highlights_sort")]
    pub(crate) sort: String,
    #[serde(default = "default_reader_highlights_saved_selections_sort")]
    pub(crate) saved_selections_sort: String,
    #[serde(default = "default_reader_highlights_saved_selections_refresh_filter")]
    pub(crate) saved_selections_refresh_filter: String,
    #[serde(default)]
    pub(crate) selected_ids: Vec<String>,
    #[serde(default)]
    pub(crate) saved_selections: Vec<ReaderHighlightsSelectionSetRecord>,
}

fn default_reader_highlights_filter() -> String {
    "all".to_string()
}

fn default_reader_highlights_sort() -> String {
    "recent".to_string()
}

fn default_reader_highlights_saved_selections_sort() -> String {
    "recent".to_string()
}

fn default_reader_highlights_saved_selections_refresh_filter() -> String {
    "all".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReaderHighlightsWorkspaceEntry {
    pub(crate) schema_version: u8,
    pub(crate) state: ReaderHighlightsWorkspaceStateRecord,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SyncSnapshotRecord {
    pub(crate) schema_version: u8,
    pub(crate) kind: String,
    pub(crate) id: String,
    pub(crate) updated_at: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) scope: Option<serde_json::Value>,
    pub(crate) payload: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SyncSnapshotDocument {
    pub(crate) schema_version: u8,
    pub(crate) exported_at: u64,
    pub(crate) records: Vec<SyncSnapshotRecord>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SyncSnapshotExportDialogResult {
    pub(crate) cancelled: bool,
    pub(crate) file_name: Option<String>,
    pub(crate) record_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SyncSnapshotImportDialogResult {
    pub(crate) cancelled: bool,
    pub(crate) file_name: Option<String>,
    pub(crate) record_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) snapshot: Option<SyncSnapshotDocument>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct KoReaderSyncExchangeExportDialogResult {
    pub(crate) cancelled: bool,
    pub(crate) file_name: Option<String>,
    pub(crate) book_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct KoReaderSyncExchangeImportDialogResult {
    pub(crate) cancelled: bool,
    pub(crate) file_name: Option<String>,
    pub(crate) book_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) document: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SyncSnapshotBookmarksStateRecord {
    pub(crate) book_key: String,
    pub(crate) bookmarks: Vec<ReaderBookmarkRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SyncSnapshotNotesStateRecord {
    pub(crate) book_key: String,
    pub(crate) notes: Vec<ReaderNoteRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SyncSnapshotHighlightsWorkspaceRecord {
    pub(crate) book_key: String,
    pub(crate) state: ReaderHighlightsWorkspaceStateRecord,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ApplySyncSnapshotRequest {
    pub(crate) library_books: Vec<LibraryBookRecord>,
    pub(crate) bookmarks: Vec<SyncSnapshotBookmarksStateRecord>,
    pub(crate) notes: Vec<SyncSnapshotNotesStateRecord>,
    pub(crate) highlights_workspace: Vec<SyncSnapshotHighlightsWorkspaceRecord>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) reader_settings: Option<SyncSnapshotRecord>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ApplySyncSnapshotResult {
    pub(crate) library_book_count: usize,
    pub(crate) bookmark_book_count: usize,
    pub(crate) note_book_count: usize,
    pub(crate) highlights_workspace_book_count: usize,
    pub(crate) restored_reader_settings: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RemoteSyncRequest {
    pub(crate) provider: String,
    pub(crate) operation: String,
    pub(crate) snapshot: SyncSnapshotDocument,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RemoteSyncResult {
    pub(crate) provider: String,
    pub(crate) operation: String,
    pub(crate) status: String,
    pub(crate) message: String,
    pub(crate) retryable: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) local_fingerprint: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) remote_fingerprint: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) remote_exported_at: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) snapshot: Option<SyncSnapshotDocument>,
}
