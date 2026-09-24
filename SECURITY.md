# Security

This project does not phone home. Please do not open public issues that include private document contents, machine paths, or credentials.

If you find a vulnerability in Moye, describe the impact and a reproduction without attaching personal files.

## Known dependencies

Dependabot will keep flagging one alert on this repository. It is written down here so nobody has to re-derive it:

**`glib` < 0.20.0 — GHSA-wrw7-89jp-8q8g** (unsound `Iterator`/`DoubleEndedIterator` impls for `glib::VariantStrIter`).

- **Linux only.** The dependency is `tauri → muda → gtk → atk → glib`. On a Windows target the crate is not in the graph at all (`cargo tree --target x86_64-pc-windows-msvc` lists zero `glib` nodes), and on macOS the GTK stack is likewise absent. Windows and macOS builds do not contain the affected code.
- **Not fixable from here.** `gtk` 0.18 pins `glib` to `^0.18`; the patched 0.20.0 belongs to the gtk-rs 0.20 generation, which Tauri does not use yet. Tauri 2.11.5 is current, so there is no version of this crate that both resolves the alert and builds.
- **Moye does not call the affected API.** Nothing in this repository touches `glib::VariantStrIter`, and the alert is a soundness bug rather than a memory-disclosure one.

The alert is dismissed with this reasoning rather than left to sit unexplained. If Tauri moves to the gtk-rs 0.20 stack, this note should be deleted along with the dismissal.
