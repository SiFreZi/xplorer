use std::process::Command;

/// Drop-in constructor for [`std::process::Command`] that suppresses the console
/// window Windows would otherwise flash for every child process.
///
/// Spawning `git` (or any console program) with the plain
/// `std::process::Command` on Windows briefly pops up a `cmd`/console window.
/// Passing the `CREATE_NO_WINDOW` creation flag prevents that. On non-Windows
/// platforms this is just a plain `std::process::Command`.
pub(crate) struct GitCommand;

impl GitCommand {
    /// Build a [`Command`] for `program` with `CREATE_NO_WINDOW` set on Windows.
    pub(crate) fn new(program: &str) -> Command {
        let mut cmd = Command::new(program);
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x0800_0000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }
        cmd
    }
}
