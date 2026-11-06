//go:build windows

// NFSU2-Save-Editor.exe: the editor page (dist/NFSU2-Save-Editor.html) in its own
// window, using the WebView2 runtime that ships with Windows 10 and 11. The page is
// embedded in the exe, so nothing is downloaded and the save never leaves the PC.
// Build with `npm run exe`.
package main

import (
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"unsafe"

	webview2 "github.com/jchv/go-webview2"
)

//go:embed editor.html
var page string

const title = "NFSU2 Save Editor"

var (
	user32            = syscall.NewLazyDLL("user32.dll")
	comdlg32          = syscall.NewLazyDLL("comdlg32.dll")
	shell32           = syscall.NewLazyDLL("shell32.dll")
	procMessageBox    = user32.NewProc("MessageBoxW")
	procGetDpiForSys  = user32.NewProc("GetDpiForSystem")
	procSysParamsInfo = user32.NewProc("SystemParametersInfoW")
	procGetSaveFile   = comdlg32.NewProc("GetSaveFileNameW")
	procCommDlgError  = comdlg32.NewProc("CommDlgExtendedError")
	procShellExecute  = shell32.NewProc("ShellExecuteW")
)

func init() { runtime.LockOSThread() } // the window and WebView2 live on the main thread

func main() {
	w, h := windowSize(1180, 880)
	wv := webview2.NewWithOptions(webview2.WebViewOptions{
		DataPath:  filepath.Join(os.Getenv("LOCALAPPDATA"), "NFSU2 Save Editor"),
		AutoFocus: true,
		WindowOptions: webview2.WindowOptions{
			Title: title, Width: w, Height: h, IconId: 1, Center: true,
		},
	})
	if wv == nil {
		if messageBox(0, "This editor needs the Microsoft Edge WebView2 Runtime, which comes with Windows 10 and 11 but seems to be missing.\n\nOpen the download page now?", 0x4|0x30) == 6 {
			openURL("https://developer.microsoft.com/microsoft-edge/webview2/")
		}
		return
	}
	defer wv.Destroy()
	go cleanupOldExe()
	hwnd := uintptr(wv.Window())

	// nfsSave(name, base64) shows a Save As dialog and writes the file. The dialog runs
	// from the window's message loop, not inside the WebView2 message callback.
	wv.Bind("nfsSave", func(name, b64 string) {
		wv.Dispatch(func() {
			data, err := base64.StdEncoding.DecodeString(b64)
			if err != nil {
				reply(wv, "nfsSaveFailed", err.Error())
				return
			}
			dest, ok := saveDialog(hwnd, name)
			if !ok {
				return
			}
			if err := os.WriteFile(dest, data, 0o644); err != nil {
				reply(wv, "nfsSaveFailed", err.Error())
				return
			}
			reply(wv, "nfsSaved", dest)
		})
	})
	// Updates: the page asks for a check once it has loaded; the check and the download
	// run in the background and report back through window.nfsUpdate* callbacks.
	var pending *releaseAsset
	wv.Bind("nfsCheckUpdate", func() {
		if version == "dev" {
			return
		}
		go func() {
			r, a, err := latestRelease()
			if err != nil || a == nil {
				return
			}
			wv.Dispatch(func() {
				pending = a
				v := parseVersion(r.Tag)
				wv.Eval(fmt.Sprintf("window.nfsUpdateAvailable(%q, %q)", fmt.Sprintf("%d.%d.%d", v[0], v[1], v[2]), r.HTMLURL))
			})
		}()
	})
	wv.Bind("nfsUpdate", func() {
		a := pending
		if a == nil {
			return
		}
		reply(wv, "nfsUpdateStatus", "Downloading the update…")
		go func() {
			exe, err := os.Executable()
			var tmp string
			if err == nil {
				tmp, err = downloadUpdate(a, exe)
			}
			wv.Dispatch(func() {
				if err == nil {
					err = swapAndRestart(exe, tmp)
				}
				if err != nil {
					reply(wv, "nfsUpdateFailed", err.Error())
					return
				}
				wv.Terminate()
			})
		}()
	})
	// Links open in the default browser instead of a bare WebView2 window.
	wv.Bind("nfsOpenUrl", func(u string) { openURL(u) })
	wv.Init(`window.NFSU2_EXE = true;
document.addEventListener("click", e => {
  const a = e.target.closest && e.target.closest("a[href^='http']");
  if (a) { e.preventDefault(); window.nfsOpenUrl(a.href); }
}, true);`)
	wv.SetHtml(page)
	wv.Run()
}

func reply(wv webview2.WebView, fn, arg string) {
	b, _ := json.Marshal(arg)
	wv.Eval("window." + fn + " && window." + fn + "(" + string(b) + ")")
}

// windowSize scales the window to the screen's DPI and keeps it inside the work area.
func windowSize(w, h uint) (uint, uint) {
	dpi := uint(96)
	if procGetDpiForSys.Find() == nil {
		if d, _, _ := procGetDpiForSys.Call(); d > 0 {
			dpi = uint(d)
		}
	}
	w, h = w*dpi/96, h*dpi/96
	var rc struct{ left, top, right, bottom int32 }
	if r, _, _ := procSysParamsInfo.Call(0x30 /* SPI_GETWORKAREA */, 0, uintptr(unsafe.Pointer(&rc)), 0); r != 0 {
		if maxW := uint(rc.right-rc.left) * 95 / 100; w > maxW {
			w = maxW
		}
		if maxH := uint(rc.bottom-rc.top) * 95 / 100; h > maxH {
			h = maxH
		}
	}
	return w, h
}

type openFileName struct {
	structSize    uint32
	owner         uintptr
	instance      uintptr
	filter        *uint16
	customFilter  *uint16
	maxCustFilter uint32
	filterIndex   uint32
	file          *uint16
	maxFile       uint32
	fileTitle     *uint16
	maxFileTitle  uint32
	initialDir    *uint16
	title         *uint16
	flags         uint32
	fileOffset    uint16
	fileExtension uint16
	defExt        *uint16
	custData      uintptr
	hook          uintptr
	templateName  *uint16
	reserved      uintptr
	reservedInt   uint32
	flagsEx       uint32
}

func saveDialog(owner uintptr, name string) (string, bool) {
	buf := make([]uint16, 32768)
	copy(buf, syscall.StringToUTF16(name))
	filter := syscall.StringToUTF16("All files\x00*.*\x00")
	dlgTitle, _ := syscall.UTF16PtrFromString("Save edited profile")
	ofn := openFileName{
		owner:   owner,
		filter:  &filter[0],
		file:    &buf[0],
		maxFile: uint32(len(buf)),
		title:   dlgTitle,
		// OFN_OVERWRITEPROMPT | OFN_NOCHANGEDIR | OFN_PATHMUSTEXIST | OFN_EXPLORER
		flags: 0x2 | 0x8 | 0x800 | 0x80000,
	}
	ofn.structSize = uint32(unsafe.Sizeof(ofn))
	if r, _, _ := procGetSaveFile.Call(uintptr(unsafe.Pointer(&ofn))); r == 0 {
		if code, _, _ := procCommDlgError.Call(); code != 0 {
			messageBox(owner, "Couldn't open the Save dialog.", 0x10)
		}
		return "", false
	}
	return syscall.UTF16ToString(buf), true
}

func messageBox(owner uintptr, text string, flags uintptr) uintptr {
	t, _ := syscall.UTF16PtrFromString(text)
	c, _ := syscall.UTF16PtrFromString(title)
	r, _, _ := procMessageBox.Call(owner, uintptr(unsafe.Pointer(t)), uintptr(unsafe.Pointer(c)), flags)
	return r
}

func openURL(u string) {
	if !strings.HasPrefix(u, "https://") && !strings.HasPrefix(u, "http://") {
		return
	}
	verb, _ := syscall.UTF16PtrFromString("open")
	target, _ := syscall.UTF16PtrFromString(u)
	procShellExecute.Call(0, uintptr(unsafe.Pointer(verb)), uintptr(unsafe.Pointer(target)), 0, 0, 1)
}
