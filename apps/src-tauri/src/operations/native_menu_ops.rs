//! Show the classic native Windows shell context menu (full `IContextMenu`,
//! including third-party shell extensions like 7-Zip, Git, TortoiseSVN).
//!
//! The React UI renders a custom HTML context menu; this command lets the user
//! fall back to the real Windows shell menu for the current selection (or the
//! folder background when `paths` is empty).

/// Show the native Windows context menu at the current cursor position.
///
/// * `dir`   – the folder that owns the items (or the folder itself for the
///   background menu when `paths` is empty).
/// * `paths` – absolute paths of the selected items; empty => background menu.
#[tauri::command]
pub async fn show_native_context_menu(
    window: tauri::Window,
    dir: String,
    paths: Vec<String>,
) -> Result<(), String> {
    #[cfg(windows)]
    {
        windows_impl::show(window, dir, paths)
    }

    #[cfg(not(windows))]
    {
        let _ = (window, dir, paths);
        Err("The classic context menu is only available on Windows".to_string())
    }
}

#[cfg(windows)]
mod windows_impl {
    use std::cell::RefCell;
    use std::ffi::c_void;
    use std::ptr;

    use tauri::Manager;
    use windows::core::{Interface, PCSTR, PCWSTR};
    use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, POINT, WPARAM};
    use windows::Win32::System::Com::{
        CoInitializeEx, CoTaskMemFree, CoUninitialize, COINIT_APARTMENTTHREADED,
    };
    use windows::Win32::UI::Shell::Common::ITEMIDLIST;
    use windows::Win32::UI::Shell::{
        DefSubclassProc, IContextMenu, IContextMenu2, IContextMenu3, IShellFolder, ILFindLastID,
        RemoveWindowSubclass, SHBindToObject, SHBindToParent, SHParseDisplayName,
        SetWindowSubclass, CMF_EXPLORE, CMF_NORMAL, CMINVOKECOMMANDINFO,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        CreatePopupMenu, DestroyMenu, GetCursorPos, TrackPopupMenuEx, SW_SHOWNORMAL,
        TPM_LEFTALIGN, TPM_RETURNCMD, TPM_RIGHTBUTTON, TPM_TOPALIGN, WM_DRAWITEM, WM_INITMENUPOPUP,
        WM_MEASUREITEM, WM_MENUCHAR,
    };

    const ID_MIN: u32 = 1;
    const ID_MAX: u32 = 0x7FFF;
    const SUBCLASS_ID: usize = 0x5850_4C52; // "XPLR"

    thread_local! {
        // Holds the active IContextMenu while its popup is on screen so the
        // window subclass can forward owner-draw / submenu messages to it.
        static ACTIVE_MENU: RefCell<Option<IContextMenu>> = const { RefCell::new(None) };
    }

    /// Entry point: hop to the main (UI) thread, run the menu, block until done.
    pub fn show(window: tauri::Window, dir: String, paths: Vec<String>) -> Result<(), String> {
        if dir.is_empty() {
            return Err("No target directory for the context menu".to_string());
        }

        // Extract the raw HWND value before moving into the Send closure.
        let hwnd_raw = window.hwnd().map_err(|e| e.to_string())?.0 as isize;

        let (tx, rx) = std::sync::mpsc::channel::<Result<(), String>>();
        window
            .app_handle()
            .run_on_main_thread(move || {
                let hwnd = HWND(hwnd_raw as *mut c_void);
                let result = unsafe { run_menu(hwnd, &dir, &paths) };
                let _ = tx.send(result);
            })
            .map_err(|e| e.to_string())?;
        rx.recv().map_err(|e| e.to_string())?
    }

    /// Parse a filesystem path into an absolute PIDL (caller frees it).
    unsafe fn parse_pidl(path: &str) -> Result<*mut ITEMIDLIST, String> {
        let wide: Vec<u16> = path.encode_utf16().chain(std::iter::once(0)).collect();
        let mut pidl: *mut ITEMIDLIST = ptr::null_mut();
        SHParseDisplayName(PCWSTR(wide.as_ptr()), None, &mut pidl, 0, None)
            .map_err(|e| format!("Failed to resolve path '{path}': {e}"))?;
        Ok(pidl)
    }

    unsafe fn run_menu(hwnd: HWND, dir: &str, paths: &[String]) -> Result<(), String> {
        // COM must be initialised (STA) on this thread. S_FALSE means it was
        // already initialised — either way we must balance with CoUninitialize.
        let hr = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        let did_init = hr.is_ok();

        let result = build_and_track(hwnd, dir, paths);

        if did_init {
            CoUninitialize();
        }
        result
    }

    unsafe fn build_and_track(hwnd: HWND, dir: &str, paths: &[String]) -> Result<(), String> {
        // Track allocations so we can free them regardless of the code path.
        let mut abs_pidls: Vec<*mut ITEMIDLIST> = Vec::new();

        let context_menu = if paths.is_empty() {
            // Background (folder) menu: bind the directory to an IShellFolder and
            // ask it for its background IContextMenu view object.
            let dir_pidl = parse_pidl(dir)?;
            abs_pidls.push(dir_pidl);

            let folder: IShellFolder = SHBindToObject(None, dir_pidl, None)
                .map_err(|e| format!("Failed to bind folder: {e}"))?;

            let context_menu: IContextMenu = folder
                .CreateViewObject(hwnd)
                .map_err(|e| format!("Failed to create background menu: {e}"))?;
            context_menu
        } else {
            // Item menu: resolve every selected path to an absolute PIDL. They all
            // share the same parent folder (single-directory view), so bind the
            // parent from the first item and use the trailing (relative) PIDL of
            // each item as the child list.
            for p in paths {
                let pidl = parse_pidl(p)?;
                abs_pidls.push(pidl);
            }

            let parent: IShellFolder = SHBindToParent(abs_pidls[0], None)
                .map_err(|e| format!("Failed to bind parent folder: {e}"))?;

            let rel_pidls: Vec<*const ITEMIDLIST> = abs_pidls
                .iter()
                .map(|p| ILFindLastID(*p) as *const ITEMIDLIST)
                .collect();

            let context_menu: IContextMenu = parent
                .GetUIObjectOf(hwnd, &rel_pidls, None)
                .map_err(|e| format!("Failed to get item menu: {e}"))?;
            context_menu
        };

        let track_result = track_popup(hwnd, &context_menu);

        // Free the absolute PIDLs (relative ones point inside these, so are freed
        // together).
        for pidl in abs_pidls {
            CoTaskMemFree(Some(pidl as *const c_void));
        }

        track_result
    }

    unsafe fn track_popup(hwnd: HWND, context_menu: &IContextMenu) -> Result<(), String> {
        let hmenu = CreatePopupMenu().map_err(|e| format!("CreatePopupMenu failed: {e}"))?;

        // Populate the menu. QueryContextMenu returns the item count encoded in a
        // success HRESULT; a genuine failure surfaces via HRESULT::ok().
        context_menu
            .QueryContextMenu(hmenu, 0, ID_MIN, ID_MAX, CMF_NORMAL | CMF_EXPLORE)
            .ok()
            .map_err(|e| format!("QueryContextMenu failed: {e}"))?;

        // Register the active menu + subclass the window so owner-draw/submenu
        // messages reach IContextMenu2/3 (needed for "Send To", "New", etc.).
        ACTIVE_MENU.with(|m| *m.borrow_mut() = Some(context_menu.clone()));
        let _ = SetWindowSubclass(hwnd, Some(subclass_proc), SUBCLASS_ID, 0);

        let mut pt = POINT::default();
        let _ = GetCursorPos(&mut pt);

        let selected = TrackPopupMenuEx(
            hmenu,
            (TPM_RETURNCMD | TPM_RIGHTBUTTON | TPM_LEFTALIGN | TPM_TOPALIGN).0,
            pt.x,
            pt.y,
            hwnd,
            None,
        );

        let _ = RemoveWindowSubclass(hwnd, Some(subclass_proc), SUBCLASS_ID);
        ACTIVE_MENU.with(|m| *m.borrow_mut() = None);

        let cmd = selected.0 as u32;
        let mut invoke_result = Ok(());
        if cmd >= ID_MIN && cmd <= ID_MAX {
            let mut info = CMINVOKECOMMANDINFO::default();
            info.cbSize = std::mem::size_of::<CMINVOKECOMMANDINFO>() as u32;
            info.hwnd = hwnd;
            info.lpVerb = PCSTR((cmd - ID_MIN) as usize as *const u8);
            info.nShow = SW_SHOWNORMAL.0;
            invoke_result = context_menu
                .InvokeCommand(&info)
                .map_err(|e| format!("InvokeCommand failed: {e}"));
        }

        let _ = DestroyMenu(hmenu);
        invoke_result
    }

    /// Window subclass procedure: forwards menu-related messages to the active
    /// IContextMenu2/3 so dynamic submenus and owner-drawn items render.
    unsafe extern "system" fn subclass_proc(
        hwnd: HWND,
        msg: u32,
        wparam: WPARAM,
        lparam: LPARAM,
        _uid: usize,
        _data: usize,
    ) -> LRESULT {
        match msg {
            WM_INITMENUPOPUP | WM_DRAWITEM | WM_MEASUREITEM => {
                let handled = ACTIVE_MENU.with(|m| {
                    if let Some(menu) = m.borrow().as_ref() {
                        if let Ok(cm3) = menu.cast::<IContextMenu3>() {
                            let mut res = LRESULT(0);
                            let _ = cm3.HandleMenuMsg2(msg, wparam, lparam, Some(&mut res));
                            return true;
                        }
                        if let Ok(cm2) = menu.cast::<IContextMenu2>() {
                            let _ = cm2.HandleMenuMsg(msg, wparam, lparam);
                            return true;
                        }
                    }
                    false
                });
                if handled {
                    return LRESULT(0);
                }
            }
            WM_MENUCHAR => {
                let mut res = LRESULT(0);
                let handled = ACTIVE_MENU.with(|m| {
                    if let Some(menu) = m.borrow().as_ref() {
                        if let Ok(cm3) = menu.cast::<IContextMenu3>() {
                            return cm3.HandleMenuMsg2(msg, wparam, lparam, Some(&mut res)).is_ok();
                        }
                    }
                    false
                });
                if handled {
                    return res;
                }
            }
            _ => {}
        }
        DefSubclassProc(hwnd, msg, wparam, lparam)
    }
}
