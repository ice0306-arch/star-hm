package handler

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/hm-star/star-hm/replayanalyzer"
)

const maxReplaySize = 20 * 1024 * 1024

func Handler(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if recovered := recover(); recovered != nil {
			writeError(w, http.StatusInternalServerError, "PARSER_CRASH", "리플레이 파서 내부 오류가 발생했습니다.", recovered)
		}
	}()

	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "INTERNAL_ERROR", "지원하지 않는 요청 방식입니다.", nil)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxReplaySize+1024)
	if err := r.ParseMultipartForm(2 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "FILE_TOO_LARGE", "업로드 가능한 리플레이 크기를 초과했습니다.", nil)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REPLAY", "분석할 리플레이 파일을 찾을 수 없습니다.", nil)
		return
	}
	defer file.Close()

	originalName := filepath.Base(header.Filename)
	if !validReplayName(originalName) {
		writeError(w, http.StatusBadRequest, "INVALID_REPLAY", "파일명에 허용되지 않는 경로 문자가 포함되어 있습니다.", nil)
		return
	}
	if !strings.EqualFold(filepath.Ext(originalName), ".rep") {
		writeError(w, http.StatusBadRequest, "INVALID_EXTENSION", "스타크래프트 .rep 파일만 업로드할 수 있습니다.", nil)
		return
	}

	tmpDir, err := os.MkdirTemp("", "hm-star-replay-*")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "TEMP_FILE_ERROR", "임시 분석 공간을 만들 수 없습니다.", nil)
		return
	}
	defer os.RemoveAll(tmpDir)

	tmpFile, err := os.CreateTemp(tmpDir, "upload-*.rep")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "TEMP_FILE_ERROR", "업로드 파일을 안전하게 저장할 수 없습니다.", nil)
		return
	}

	hasher := sha256.New()
	written, copyErr := io.Copy(tmpFile, io.LimitReader(io.TeeReader(file, hasher), maxReplaySize+1))
	closeErr := tmpFile.Close()
	if copyErr != nil || closeErr != nil {
		writeError(w, http.StatusInternalServerError, "TEMP_FILE_ERROR", "업로드 파일을 저장하는 중 오류가 발생했습니다.", nil)
		return
	}
	if written == 0 {
		writeError(w, http.StatusBadRequest, "EMPTY_FILE", "빈 리플레이 파일은 분석할 수 없습니다.", nil)
		return
	}
	if written > maxReplaySize {
		writeError(w, http.StatusBadRequest, "FILE_TOO_LARGE", "업로드 가능한 리플레이 크기를 초과했습니다.", nil)
		return
	}

	result, apiErr := replayanalyzer.AnalyzeFile(tmpFile.Name(), originalName, written, hex.EncodeToString(hasher.Sum(nil)))
	if apiErr != nil {
		writeError(w, apiErr.Status, apiErr.Code, apiErr.Message, apiErr.Details)
		return
	}
	if r.FormValue("compact") == "admin" {
		compactAnalysisResult(result)
	}
	writeJSON(w, http.StatusOK, result)
}

func compactAnalysisResult(result *replayanalyzer.SuccessResponse) {
	if result == nil {
		return
	}
	result.Commands = nil
	result.Chat = nil
	if len(result.Timeline) > 80 {
		step := (len(result.Timeline) + 79) / 80
		timeline := make([]replayanalyzer.TimelinePoint, 0, 80)
		for index, point := range result.Timeline {
			if index%step == 0 {
				timeline = append(timeline, point)
			}
		}
		result.Timeline = timeline
	}
}

func validReplayName(name string) bool {
	if strings.TrimSpace(name) == "" {
		return false
	}
	return !strings.Contains(name, "..") && !strings.ContainsAny(name, `/\`)
}

func writeError(w http.ResponseWriter, status int, code, message string, details any) {
	writeJSON(w, status, map[string]any{
		"success": false,
		"error": map[string]any{
			"code":    code,
			"message": message,
			"details": stringifyDetails(details),
		},
	})
}

func stringifyDetails(details any) any {
	switch value := details.(type) {
	case nil:
		return nil
	case string:
		return value
	default:
		return fmt.Sprint(value)
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	encoder := json.NewEncoder(w)
	encoder.SetEscapeHTML(false)
	_ = encoder.Encode(payload)
}
