// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Ownership: keep main.rs minimal so the real desktop runtime contract stays in
// br1_lib::run and can be exercised by tests without duplicating bootstrap code.
fn main() {
    br1_lib::run()
}
