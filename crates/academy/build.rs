//! Embeds the course: every file under `course/` becomes `(relative path, contents)` in
//! `COURSE_FILES`, sorted, so adding a lesson needs no code change.
//!
//! `course.zh-CN/` mirrors `course/` with the same relative paths. A file that exists
//! there replaces the English one in `COURSE_FILES_ZH`; the rest stay English, so a
//! half-translated course still loads and the app can pick either table.

use std::path::{Path, PathBuf};

fn collect(dir: &Path, out: &mut Vec<PathBuf>) {
    let Ok(entries) = std::fs::read_dir(dir) else { return };
    let mut entries: Vec<_> = entries.flatten().map(|e| e.path()).collect();
    entries.sort();
    for path in entries {
        if path.is_dir() {
            collect(&path, out);
        } else if matches!(path.extension().and_then(|e| e.to_str()), Some("md" | "yaml")) {
            out.push(path);
        }
    }
}

fn main() {
    let manifest = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let root = manifest.join("course");
    let translated_root = manifest.join("course.zh-CN");
    println!("cargo:rerun-if-changed={}", root.display());
    println!("cargo:rerun-if-changed={}", translated_root.display());

    let mut files = Vec::new();
    collect(&root, &mut files);

    let mut original = String::from("pub(crate) const COURSE_FILES: &[(&str, &str)] = &[\n");
    let mut translated = String::from("pub(crate) const COURSE_FILES_ZH: &[(&str, &str)] = &[\n");
    for path in &files {
        println!("cargo:rerun-if-changed={}", path.display());
        let rel = path.strip_prefix(&root).unwrap().to_string_lossy().replace('\\', "/");
        original.push_str(&format!("    ({rel:?}, include_str!({:?})),\n", path.display().to_string()));

        let twin = translated_root.join(&rel);
        let chosen = if twin.is_file() {
            println!("cargo:rerun-if-changed={}", twin.display());
            twin
        } else {
            path.clone()
        };
        translated.push_str(&format!("    ({rel:?}, include_str!({:?})),\n", chosen.display().to_string()));
    }
    original.push_str("];\n");
    translated.push_str("];\n");

    let out = PathBuf::from(std::env::var("OUT_DIR").unwrap()).join("course_files.rs");
    std::fs::write(out, format!("{original}\n{translated}")).expect("write course_files.rs");
}
