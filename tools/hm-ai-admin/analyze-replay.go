package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/hm-star/star-hm/replayanalyzer"
)

func main() {
	if len(os.Args) < 2 {
		exitJSON(map[string]any{"ok": false, "error": "usage: analyze-replay <path> [original-name]"}, 2)
	}
	path := os.Args[1]
	originalName := filepath.Base(path)
	if len(os.Args) >= 3 && os.Args[2] != "" {
		originalName = os.Args[2]
	}

	file, err := os.Open(path)
	if err != nil {
		exitJSON(map[string]any{"ok": false, "error": err.Error()}, 1)
	}
	defer file.Close()

	hasher := sha256.New()
	size, err := io.Copy(hasher, file)
	if err != nil {
		exitJSON(map[string]any{"ok": false, "error": err.Error()}, 1)
	}

	result, apiErr := replayanalyzer.AnalyzeFile(path, originalName, size, hex.EncodeToString(hasher.Sum(nil)))
	if apiErr != nil {
		exitJSON(map[string]any{
			"ok":      false,
			"status":  apiErr.Status,
			"code":    apiErr.Code,
			"message": apiErr.Message,
			"details": fmt.Sprint(apiErr.Details),
		}, 1)
	}

	exitJSON(map[string]any{"ok": true, "result": result}, 0)
}

func exitJSON(payload any, code int) {
	encoder := json.NewEncoder(os.Stdout)
	encoder.SetEscapeHTML(false)
	_ = encoder.Encode(payload)
	os.Exit(code)
}
