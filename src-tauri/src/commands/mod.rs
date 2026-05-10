// Ownership: this module list is the desktop command surface exported to the
// Tauri runtime. Adding a module here is a product-level capability change, not
// just a local refactor.

pub(crate) mod bookmarks;
pub(crate) mod catalogs;
pub(crate) mod highlights_workspace;
pub(crate) mod koreader_remote_sync;
pub(crate) mod library;
pub(crate) mod remote_sync;
pub(crate) mod reader_services;
pub(crate) mod notes;
pub(crate) mod search_cache;
pub(crate) mod sync_snapshot;
