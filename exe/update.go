//go:build windows

package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

// version is set at build time: -ldflags "-X main.version=1.2.3".
var version = "dev"

const (
	latestAPI = "https://api.github.com/repos/nrpabst/NFSU2-Save-Editor/releases/latest"
	assetName = "NFSU2-Save-Editor.exe"
	// Only ever download the exe from this repository's releases.
	downloadPrefix = "https://github.com/nrpabst/NFSU2-Save-Editor/releases/download/"
)

type releaseAsset struct {
	Name   string `json:"name"`
	URL    string `json:"browser_download_url"`
	Size   int64  `json:"size"`
	Digest string `json:"digest"` // "sha256:<hex>"
}

type release struct {
	Tag     string         `json:"tag_name"`
	HTMLURL string         `json:"html_url"`
	Assets  []releaseAsset `json:"assets"`
}

var client = &http.Client{Timeout: 2 * time.Minute}

func parseVersion(v string) [3]int {
	var out [3]int
	for i, p := range strings.SplitN(strings.TrimPrefix(v, "v"), ".", 3) {
		out[i], _ = strconv.Atoi(strings.TrimFunc(p, func(r rune) bool { return r < '0' || r > '9' }))
	}
	return out
}

func newer(a, b string) bool {
	x, y := parseVersion(a), parseVersion(b)
	for i := range x {
		if x[i] != y[i] {
			return x[i] > y[i]
		}
	}
	return false
}

// latestRelease returns the newest release and its exe, or nil if this build is current.
func latestRelease() (*release, *releaseAsset, error) {
	req, _ := http.NewRequest("GET", latestAPI, nil)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "NFSU2-Save-Editor/"+version)
	res, err := client.Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return nil, nil, fmt.Errorf("GitHub answered %s", res.Status)
	}
	var r release
	if err := json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&r); err != nil {
		return nil, nil, err
	}
	if !newer(r.Tag, version) {
		return nil, nil, nil
	}
	for i, a := range r.Assets {
		if a.Name == assetName && strings.HasPrefix(a.URL, downloadPrefix) {
			return &r, &r.Assets[i], nil
		}
	}
	return nil, nil, nil
}

// downloadUpdate saves the new exe next to the running one as <exe>.new and checks it.
func downloadUpdate(a *releaseAsset, exe string) (string, error) {
	req, _ := http.NewRequest("GET", a.URL, nil)
	req.Header.Set("User-Agent", "NFSU2-Save-Editor/"+version)
	res, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return "", fmt.Errorf("download failed: %s", res.Status)
	}
	data, err := io.ReadAll(io.LimitReader(res.Body, 64<<20))
	if err != nil {
		return "", err
	}
	if a.Size > 0 && int64(len(data)) != a.Size {
		return "", errors.New("the download was incomplete")
	}
	if len(data) < 2 || data[0] != 'M' || data[1] != 'Z' {
		return "", errors.New("the download isn't a Windows program")
	}
	if want, ok := strings.CutPrefix(a.Digest, "sha256:"); ok {
		sum := sha256.Sum256(data)
		if !strings.EqualFold(hex.EncodeToString(sum[:]), want) {
			return "", errors.New("the download's checksum doesn't match")
		}
	}
	tmp := exe + ".new"
	if err := os.WriteFile(tmp, data, 0o755); err != nil {
		return "", fmt.Errorf("can't write next to the exe (%v). Download the new version by hand", err)
	}
	return tmp, nil
}

// swapAndRestart puts the new exe in place and starts it. Windows lets a running exe be
// renamed but not overwritten, so the old one becomes <exe>.old and is deleted on the
// next start.
func swapAndRestart(exe, tmp string) error {
	old := exe + ".old"
	os.Remove(old)
	if err := os.Rename(exe, old); err != nil {
		os.Remove(tmp)
		return err
	}
	if err := os.Rename(tmp, exe); err != nil {
		os.Rename(old, exe)
		return err
	}
	return exec.Command(exe).Start()
}

func cleanupOldExe() {
	if exe, err := os.Executable(); err == nil {
		os.Remove(exe + ".old")
	}
}
