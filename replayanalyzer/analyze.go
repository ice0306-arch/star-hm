package replayanalyzer

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"reflect"
	"sort"
	"strings"
	"time"

	"github.com/icza/screp/rep"
	"github.com/icza/screp/rep/repcmd"
	"github.com/icza/screp/rep/repcore"
	"github.com/icza/screp/repparser"
)

type APIError struct {
	Status  int
	Code    string
	Message string
	Details any
}

type SuccessResponse struct {
	Success          bool                   `json:"success"`
	Parser           ParserInfo             `json:"parser"`
	AnalysisRun      AnalysisRun            `json:"analysisRun"`
	ConfidencePolicy ConfidencePolicy       `json:"confidencePolicy"`
	Pipeline         []PipelineStage        `json:"pipeline"`
	Canonical        CanonicalReplaySummary `json:"canonical"`
	Replay           ReplayInfo             `json:"replay"`
	Players          []PlayerInfo           `json:"players"`
	Timeline         []TimelinePoint        `json:"timeline"`
	Commands         []CommandInfo          `json:"commands"`
	BuildOrder       []BuildEvent           `json:"buildOrder"`
	Hotkeys          []HotkeyStat           `json:"hotkeys"`
	Chat             []ChatMessage          `json:"chat"`
	Semantic         SemanticAnalysisResult `json:"semantic"`
	Coaching         CoachingAnalysis       `json:"coaching"`
	Analysis         AnalysisReport         `json:"analysis"`
	Availability     map[string]any         `json:"availability"`
}

type ParserInfo struct {
	Name        string `json:"name"`
	Version     string `json:"version"`
	EAPMVersion string `json:"eapmVersion"`
}

type AnalysisRun struct {
	ID                    string `json:"id"`
	Status                string `json:"status"`
	ParserName            string `json:"parserName"`
	ParserVersion         string `json:"parserVersion"`
	SemanticEngineName    string `json:"semanticEngineName"`
	SemanticEngineVersion string `json:"semanticEngineVersion"`
	RulesetVersion        string `json:"rulesetVersion"`
	StartedAt             string `json:"startedAt"`
	CompletedAt           string `json:"completedAt"`
	ProcessingTimeMs      int64  `json:"processingTimeMs"`
}

type ConfidencePolicy struct {
	Version         string  `json:"version"`
	High            float64 `json:"high"`
	Medium          float64 `json:"medium"`
	Low             float64 `json:"low"`
	HideBelow       float64 `json:"hideBelow"`
	LowDisplayLabel string  `json:"lowDisplayLabel"`
}

type PipelineStage struct {
	Code   string `json:"code"`
	Label  string `json:"label"`
	Status string `json:"status"`
	Detail string `json:"detail"`
}

type ReplayInfo struct {
	FileName         string  `json:"fileName"`
	FileSize         int64   `json:"fileSize"`
	FileHash         string  `json:"fileHash"`
	BinarySignature  string  `json:"binarySignature"`
	Source           string  `json:"source"`
	Protected        bool    `json:"protected"`
	Downloadable     bool    `json:"downloadable"`
	ExactFingerprint string  `json:"exactFingerprint"`
	FuzzyFingerprint string  `json:"fuzzyFingerprint"`
	GameTitle        *string `json:"gameTitle"`
	StartedAt        *string `json:"startedAt"`
	DurationSecs     *int    `json:"durationSeconds"`
	GameType         string  `json:"gameType"`
	Map              MapInfo `json:"map"`
	PlayerCount      int     `json:"playerCount"`
	ObserverCount    int     `json:"observerCount"`
}

type MapInfo struct {
	Name    *string `json:"name"`
	Width   *int    `json:"width"`
	Height  *int    `json:"height"`
	Tileset *string `json:"tileset"`
}

type Point struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type PlayerResult struct {
	Outcome string `json:"outcome"`
	Status  string `json:"status"`
}

type PlayerInfo struct {
	ID                  int          `json:"id"`
	Name                string       `json:"name"`
	Race                string       `json:"race"`
	Team                *int         `json:"team"`
	Observer            bool         `json:"observer"`
	StartLocation       *Point       `json:"startLocation"`
	LastCommandSeconds  *float64     `json:"lastCommandSeconds"`
	TotalCommands       int          `json:"totalCommands"`
	EffectiveCommands   int          `json:"effectiveCommands"`
	IneffectiveCommands int          `json:"ineffectiveCommands"`
	APM                 *int         `json:"apm"`
	EAPM                *int         `json:"eapm"`
	EffectiveRate       *float64     `json:"effectiveRate"`
	MostUsedHotkey      *int         `json:"mostUsedHotkey"`
	Result              PlayerResult `json:"result"`
}

type TimelinePoint struct {
	PlayerID     int     `json:"playerId"`
	PlayerName   string  `json:"playerName"`
	StartSeconds int     `json:"startSeconds"`
	EndSeconds   int     `json:"endSeconds"`
	APM          float64 `json:"apm"`
	EAPM         float64 `json:"eapm"`
}

type CommandInfo struct {
	Index              int     `json:"index"`
	Frame              int32   `json:"frame"`
	TimeSeconds        float64 `json:"timeSeconds"`
	TimeLabel          string  `json:"timeLabel"`
	PlayerID           int     `json:"playerId"`
	PlayerName         string  `json:"playerName"`
	Type               string  `json:"type"`
	Category           string  `json:"category"`
	Details            string  `json:"details"`
	UnitOrBuilding     *string `json:"unitOrBuilding"`
	Position           *Point  `json:"position"`
	Effective          bool    `json:"effective"`
	InefficiencyReason *string `json:"inefficiencyReason"`
}

type BuildEvent struct {
	ID          string  `json:"id"`
	Frame       int32   `json:"frame"`
	TimeSeconds float64 `json:"timeSeconds"`
	TimeLabel   string  `json:"timeLabel"`
	PlayerID    int     `json:"playerId"`
	PlayerName  string  `json:"playerName"`
	Category    string  `json:"category"`
	Label       string  `json:"label"`
	Position    *Point  `json:"position"`
}

type HotkeyStat struct {
	PlayerID    int     `json:"playerId"`
	PlayerName  string  `json:"playerName"`
	Group       int     `json:"group"`
	Assigned    int     `json:"assigned"`
	Added       int     `json:"added"`
	Selected    int     `json:"selected"`
	Total       int     `json:"total"`
	SelectShare float64 `json:"selectShare"`
}

type ChatMessage struct {
	TimeLabel  string `json:"timeLabel"`
	PlayerName string `json:"playerName"`
	Message    string `json:"message"`
}

type AnalysisReport struct {
	Sections []AnalysisSection `json:"sections"`
	Cautions []string          `json:"cautions"`
}

type AnalysisSection struct {
	Title string         `json:"title"`
	Items []AnalysisItem `json:"items"`
}

type AnalysisItem struct {
	Text     string  `json:"text"`
	Evidence *string `json:"evidence"`
}

type CanonicalReplaySummary struct {
	ReplayID          string     `json:"replayId"`
	SchemaVersion     string     `json:"schemaVersion"`
	ModelVersion      string     `json:"modelVersion"`
	Parser            ParserInfo `json:"parser"`
	CommandCount      int        `json:"commandCount"`
	BuildEventCount   int        `json:"buildEventCount"`
	HotkeyEventCount  int        `json:"hotkeyEventCount"`
	ChatEventCount    int        `json:"chatEventCount"`
	ExactFingerprint  string     `json:"exactFingerprint"`
	FuzzyFingerprint  string     `json:"fuzzyFingerprint"`
	ValidationStatus  string     `json:"validationStatus"`
	NormalizationNote string     `json:"normalizationNote"`
}

type SemanticAnalysisResult struct {
	Engine               EngineInfo                `json:"engine"`
	RulesetVersion       string                    `json:"rulesetVersion"`
	Status               string                    `json:"status"`
	BuildClassifications []BuildClassification     `json:"buildClassifications"`
	SemanticEvents       []SemanticEvent           `json:"semanticEvents"`
	SkillMetrics         []SkillMetric             `json:"skillMetrics"`
	CommandEfficiency    []CommandEfficiencyReport `json:"commandEfficiency"`
	ProductionReports    []ProductionReport        `json:"productionReports"`
	HotkeyReports        []HotkeyReport            `json:"hotkeyReports"`
	MultitaskingReports  []MultitaskingReport      `json:"multitaskingReports"`
	MapEvents            []MapSemanticEvent        `json:"mapEvents"`
	Warnings             []AnalysisWarning         `json:"warnings"`
}

type EngineInfo struct {
	Name      string `json:"name"`
	Version   string `json:"version"`
	CommitSha string `json:"commitSha,omitempty"`
}

type BuildClassification struct {
	PlayerID          int                `json:"playerId"`
	PlayerName        string             `json:"playerName"`
	Matchup           string             `json:"matchup"`
	BuildCode         string             `json:"buildCode"`
	BuildName         string             `json:"buildName"`
	Confidence        float64            `json:"confidence"`
	Status            string             `json:"status"`
	AlternativeBuilds []AlternativeBuild `json:"alternativeBuilds"`
	Evidence          AnalysisEvidence   `json:"evidence"`
	ClassifierVersion string             `json:"classifierVersion"`
}

type AlternativeBuild struct {
	BuildCode  string  `json:"buildCode"`
	BuildName  string  `json:"buildName"`
	Confidence float64 `json:"confidence"`
}

type SemanticEvent struct {
	ID          string           `json:"id"`
	EventType   string           `json:"eventType"`
	Subtype     string           `json:"subtype,omitempty"`
	PlayerID    *int             `json:"playerId,omitempty"`
	PlayerName  string           `json:"playerName,omitempty"`
	StartFrame  int32            `json:"startFrame"`
	EndFrame    *int32           `json:"endFrame,omitempty"`
	StartSecond float64          `json:"startSecond"`
	EndSecond   *float64         `json:"endSecond,omitempty"`
	Confidence  float64          `json:"confidence"`
	Evidence    AnalysisEvidence `json:"evidence"`
}

type SkillMetric struct {
	PlayerID        int              `json:"playerId"`
	PlayerName      string           `json:"playerName"`
	MetricType      string           `json:"metricType"`
	Label           string           `json:"label"`
	RawValue        float64          `json:"rawValue"`
	Unit            string           `json:"unit"`
	NormalizedScore int              `json:"normalizedScore"`
	Percentile      *int             `json:"percentile"`
	SampleSize      int              `json:"sampleSize"`
	BenchmarkGroup  string           `json:"benchmarkGroup"`
	Confidence      float64          `json:"confidence"`
	Evidence        AnalysisEvidence `json:"evidence"`
	MetricVersion   string           `json:"metricVersion"`
}

type CommandEfficiencyReport struct {
	PlayerID                 int              `json:"playerId"`
	PlayerName               string           `json:"playerName"`
	APM                      *int             `json:"apm"`
	EAPM                     *int             `json:"eapm"`
	EffectiveRate            *float64         `json:"effectiveRate"`
	IneffectiveCommands      int              `json:"ineffectiveCommands"`
	RepeatedCommandCandidate int              `json:"repeatedCommandCandidate"`
	SegmentEfficiency        []SegmentMetric  `json:"segmentEfficiency"`
	Evidence                 AnalysisEvidence `json:"evidence"`
}

type SegmentMetric struct {
	Segment       string   `json:"segment"`
	StartSecond   int      `json:"startSecond"`
	EndSecond     int      `json:"endSecond"`
	APM           float64  `json:"apm"`
	EAPM          float64  `json:"eapm"`
	EffectiveRate *float64 `json:"effectiveRate"`
}

type ProductionReport struct {
	PlayerID            int              `json:"playerId"`
	PlayerName          string           `json:"playerName"`
	ProductionEvents    int              `json:"productionEvents"`
	ProductionGaps      []ProductionGap  `json:"productionGaps"`
	FacilityUtilization *float64         `json:"facilityUtilization"`
	StabilityScore      int              `json:"stabilityScore"`
	Evidence            AnalysisEvidence `json:"evidence"`
}

type ProductionGap struct {
	StartSecond float64 `json:"startSecond"`
	EndSecond   float64 `json:"endSecond"`
	Duration    float64 `json:"duration"`
	ReasonCode  string  `json:"reasonCode"`
}

type HotkeyReport struct {
	PlayerID         int              `json:"playerId"`
	PlayerName       string           `json:"playerName"`
	UsedGroups       []int            `json:"usedGroups"`
	BreadthScore     int              `json:"breadthScore"`
	ConsistencyScore int              `json:"consistencyScore"`
	DominantGroup    *int             `json:"dominantGroup"`
	DominantShare    float64          `json:"dominantShare"`
	Evidence         AnalysisEvidence `json:"evidence"`
}

type MultitaskingReport struct {
	PlayerID             int              `json:"playerId"`
	PlayerName           string           `json:"playerName"`
	PositionedCommands   int              `json:"positionedCommands"`
	RegionSwitchEstimate int              `json:"regionSwitchEstimate"`
	Confidence           float64          `json:"confidence"`
	Qualifier            string           `json:"qualifier"`
	Evidence             AnalysisEvidence `json:"evidence"`
}

type MapSemanticEvent struct {
	ID          string           `json:"id"`
	EventType   string           `json:"eventType"`
	PlayerID    int              `json:"playerId"`
	PlayerName  string           `json:"playerName"`
	Position    *Point           `json:"position"`
	StartSecond float64          `json:"startSecond"`
	Confidence  float64          `json:"confidence"`
	Evidence    AnalysisEvidence `json:"evidence"`
}

type AnalysisWarning struct {
	Code     string         `json:"code"`
	Severity string         `json:"severity"`
	Message  string         `json:"message"`
	Context  map[string]any `json:"context"`
}

type AnalysisEvidence struct {
	Confidence  float64            `json:"confidence"`
	CommandIDs  []string           `json:"commandIds,omitempty"`
	Frames      []int32            `json:"frames,omitempty"`
	Seconds     []float64          `json:"seconds,omitempty"`
	UnitTypes   []string           `json:"unitTypes,omitempty"`
	Positions   []Point            `json:"positions,omitempty"`
	ReasonCodes []string           `json:"reasonCodes"`
	Explanation string             `json:"explanation"`
	Benchmark   *EvidenceBenchmark `json:"benchmark,omitempty"`
}

type EvidenceBenchmark struct {
	Group      string   `json:"group"`
	SampleSize int      `json:"sampleSize"`
	Average    *float64 `json:"average,omitempty"`
	Median     *float64 `json:"median,omitempty"`
	Percentile *float64 `json:"percentile,omitempty"`
}

func AnalyzeFile(path, originalName string, fileSize int64, fileHash string) (*SuccessResponse, *APIError) {
	startedAt := time.Now().UTC()
	replay, err := repparser.ParseFileConfig(path, repparser.Config{
		Commands: true,
		MapData:  true,
		Logger:   log.New(io.Discard, "", 0),
	})
	if err != nil {
		if errors.Is(err, repparser.ErrNotReplayFile) {
			return nil, apiError(http.StatusBadRequest, "INVALID_REPLAY", "지원하지 않거나 손상된 리플레이 파일입니다.", err.Error())
		}
		return nil, apiError(http.StatusBadRequest, "UNSUPPORTED_REPLAY", "파서가 이 리플레이 형식을 완전히 해석하지 못했습니다.", err.Error())
	}
	if replay == nil || replay.Header == nil {
		return nil, apiError(http.StatusBadRequest, "INVALID_REPLAY", "리플레이 헤더를 읽을 수 없습니다.", nil)
	}
	replay.Compute()

	players := normalizePlayers(replay)
	commands, buildOrder := normalizeCommands(replay)
	hotkeys := normalizeHotkeys(replay, players)
	attachMostUsedHotkeys(players, hotkeys)
	parser := ParserInfo{
		Name:        "screp",
		Version:     strings.TrimPrefix(repparser.Version, "v"),
		EAPMVersion: strings.TrimPrefix(rep.EAPMVersion, "v"),
	}
	replayInfo := normalizeReplay(replay, originalName, fileSize, fileHash, readBinarySignature(path))
	timeline := normalizeTimeline(replay, players, 60)
	chat := normalizeChat(replay)
	semantic := generateSemanticAnalysis(players, timeline, commands, buildOrder, hotkeys, replayInfo)
	coaching := generateCoachingAnalysis(players, commands, buildOrder, hotkeys, timeline, replayInfo, semantic)
	completedAt := time.Now().UTC()
	result := &SuccessResponse{
		Success: true,
		Parser:  parser,
		AnalysisRun: AnalysisRun{
			ID:                    stableID("analysis-run", fileHash, parser.Version, hmAIRulesetVersion),
			Status:                semantic.Status,
			ParserName:            parser.Name,
			ParserVersion:         parser.Version,
			SemanticEngineName:    semantic.Engine.Name,
			SemanticEngineVersion: semantic.Engine.Version,
			RulesetVersion:        semantic.RulesetVersion,
			StartedAt:             startedAt.Format("2006-01-02T15:04:05Z"),
			CompletedAt:           completedAt.Format("2006-01-02T15:04:05Z"),
			ProcessingTimeMs:      completedAt.Sub(startedAt).Milliseconds(),
		},
		ConfidencePolicy: confidencePolicy(),
		Pipeline:         analysisPipeline(semantic.Status),
		Canonical:        canonicalSummary(fileHash, parser, len(commands), len(buildOrder), len(hotkeys), len(chat), replayInfo),
		Replay:           replayInfo,
		Players:          players,
		Timeline:         timeline,
		Commands:         commands,
		BuildOrder:       buildOrder,
		Hotkeys:          hotkeys,
		Chat:             chat,
		Semantic:         semantic,
		Coaching:         coaching,
		Availability: map[string]any{
			"commands":         len(commands) > 0,
			"mapData":          replay.MapData != nil,
			"buildOrder":       len(buildOrder) > 0,
			"hotkeys":          len(hotkeys) > 0,
			"resultConfidence": resultConfidence(replay),
			"source":           replayInfo.Source,
			"replayDownload":   replayInfo.Downloadable,
		},
	}
	result.Analysis = generateAnalysis(result)
	return result, nil
}

func apiError(status int, code, message string, details any) *APIError {
	return &APIError{Status: status, Code: code, Message: message, Details: details}
}

const (
	canonicalSchemaVersion = "hm-canonical-replay/2026-08-01"
	canonicalModelVersion  = "canonical-normalizer/0.2.0"
	hmAIRulesetVersion     = "hm-ai-ruleset/2026-08-01"
	hmAIEngineVersion      = "hm-ai-rule-engine/0.2.0"
)

func normalizeReplay(r *rep.Replay, originalName string, fileSize int64, fileHash string, binarySignature string) ReplayInfo {
	header := r.Header
	duration := int(math.Round(header.Duration().Seconds()))
	var durationPtr *int
	if duration > 0 {
		durationPtr = &duration
	}
	var startedAt *string
	if !header.StartTime.IsZero() {
		startedAt = strPtr(header.StartTime.UTC().Format("2006-01-02T15:04:05Z"))
	}
	mapName := cleanPtr(header.Map)
	if r.MapData != nil {
		if cleaned := cleanText(r.MapData.Name); cleaned != "" {
			mapName = &cleaned
		}
	}
	width, height := int(header.MapWidth), int(header.MapHeight)
	var widthPtr, heightPtr *int
	if width > 0 {
		widthPtr = &width
	}
	if height > 0 {
		heightPtr = &height
	}
	var tileset *string
	if r.MapData != nil && r.MapData.TileSet != nil {
		tileset = cleanPtr(r.MapData.TileSet.Name)
	}
	observerCount := 0
	for _, player := range header.Players {
		if player.Observer {
			observerCount++
		}
	}
	exactFingerprint, fuzzyFingerprint := replayFingerprints(r, duration)
	return ReplayInfo{
		FileName:         originalName,
		FileSize:         fileSize,
		FileHash:         fileHash,
		BinarySignature:  binarySignature,
		Source:           "DIRECT_UPLOAD",
		Protected:        false,
		Downloadable:     false,
		ExactFingerprint: exactFingerprint,
		FuzzyFingerprint: fuzzyFingerprint,
		GameTitle:        cleanPtr(header.Title),
		StartedAt:        startedAt,
		DurationSecs:     durationPtr,
		GameType:         enumName(header.Type, "unknown"),
		Map:              MapInfo{Name: mapName, Width: widthPtr, Height: heightPtr, Tileset: tileset},
		PlayerCount:      len(header.Players) - observerCount,
		ObserverCount:    observerCount,
	}
}

func confidencePolicy() ConfidencePolicy {
	return ConfidencePolicy{
		Version:         "confidence-policy/2026-08-01",
		High:            0.90,
		Medium:          0.70,
		Low:             0.50,
		HideBelow:       0.50,
		LowDisplayLabel: "가능성 있음",
	}
}

func analysisPipeline(status string) []PipelineStage {
	return []PipelineStage{
		{Code: "UPLOADING", Label: "업로드", Status: "COMPLETED", Detail: "브라우저에서 Vercel 분석 함수로 전송 완료"},
		{Code: "VALIDATING", Label: "보안 검사", Status: "COMPLETED", Detail: "확장자, 크기, 경로 문자, 빈 파일 검사 완료"},
		{Code: "HASHING", Label: "해시 계산", Status: "COMPLETED", Detail: "SHA-256 파일 해시 계산 완료"},
		{Code: "PARSING", Label: "Raw Parsing", Status: "COMPLETED", Detail: "screp 계열 Go Parser로 명령 로그 추출"},
		{Code: "NORMALIZING", Label: "Canonical 변환", Status: "COMPLETED", Detail: canonicalSchemaVersion},
		{Code: "SEMANTIC_ANALYSIS", Label: "Semantic Intelligence", Status: status, Detail: hmAIRulesetVersion},
		{Code: "OBJECT_STORAGE", Label: "원본 보관", Status: "SKIPPED", Detail: "현재 Vercel 즉시 분석 모드에서는 원본 파일을 영구 저장하지 않음"},
		{Code: "DATABASE_SAVE", Label: "PostgreSQL 저장", Status: "SKIPPED", Detail: "운영 DB 연결 전까지 분석 결과는 응답 JSON으로만 제공"},
	}
}

func canonicalSummary(fileHash string, parser ParserInfo, commandCount, buildEventCount, hotkeyEventCount, chatEventCount int, replay ReplayInfo) CanonicalReplaySummary {
	return CanonicalReplaySummary{
		ReplayID:          stableID("replay", fileHash),
		SchemaVersion:     canonicalSchemaVersion,
		ModelVersion:      canonicalModelVersion,
		Parser:            parser,
		CommandCount:      commandCount,
		BuildEventCount:   buildEventCount,
		HotkeyEventCount:  hotkeyEventCount,
		ChatEventCount:    chatEventCount,
		ExactFingerprint:  replay.ExactFingerprint,
		FuzzyFingerprint:  replay.FuzzyFingerprint,
		ValidationStatus:  "VALID",
		NormalizationNote: "Raw Parser 결과를 Canonical Replay Summary로 정규화했습니다.",
	}
}

func replayFingerprints(r *rep.Replay, duration int) (string, string) {
	mapName := ""
	if r.Header.Map != "" {
		mapName = cleanText(r.Header.Map)
	}
	players := []string{}
	races := []string{}
	teams := []string{}
	for _, player := range r.Header.Players {
		if player.Observer {
			continue
		}
		players = append(players, strings.ToLower(cleanText(player.Name)))
		races = append(races, enumName(player.Race, "unknown"))
		teams = append(teams, fmt.Sprint(player.Team))
	}
	sort.Strings(players)
	sort.Strings(races)
	sort.Strings(teams)
	started := ""
	if !r.Header.StartTime.IsZero() {
		started = r.Header.StartTime.UTC().Format("2006-01-02T15:04:05Z")
	}
	exact := strings.Join([]string{mapName, started, fmt.Sprint(duration), strings.Join(players, ","), strings.Join(teams, ",")}, "|")
	fuzzy := strings.Join([]string{strings.ToLower(mapName), roundedStartedAt(r.Header.StartTime), fmt.Sprint(roundDuration(duration)), strings.Join(players, ","), strings.Join(races, ",")}, "|")
	return stableID("exact", exact), stableID("fuzzy", fuzzy)
}

func roundedStartedAt(value time.Time) string {
	if value.IsZero() {
		return "unknown"
	}
	return value.UTC().Truncate(5 * time.Minute).Format("2006-01-02T15:04Z")
}

func roundDuration(duration int) int {
	if duration <= 0 {
		return 0
	}
	return int(math.Round(float64(duration)/30.0) * 30)
}

func normalizePlayers(r *rep.Replay) []PlayerInfo {
	players := make([]PlayerInfo, 0, len(r.Header.Players))
	winnerTeam := byte(0)
	if r.Computed != nil {
		winnerTeam = r.Computed.WinnerTeam
	}
	for _, player := range r.Header.Players {
		desc := playerDesc(r, player.ID)
		total, effective := 0, 0
		var apm, eapm *int
		var rate *float64
		var last *float64
		var start *Point
		if desc != nil {
			total = int(desc.CmdCount)
			effective = int(desc.EffectiveCmdCount)
			apmValue, eapmValue := int(desc.APM), int(desc.EAPM)
			apm, eapm = &apmValue, &eapmValue
			if total > 0 {
				rateValue := round1(float64(effective) * 100 / float64(total))
				rate = &rateValue
			}
			if desc.LastCmdFrame > 0 {
				sec := frameSeconds(desc.LastCmdFrame)
				last = &sec
			}
			if desc.StartLocation != nil {
				start = &Point{X: int(desc.StartLocation.X), Y: int(desc.StartLocation.Y)}
			}
		}
		var team *int
		if !player.Observer {
			value := int(player.Team)
			team = &value
		}
		players = append(players, PlayerInfo{
			ID:                  int(player.ID),
			Name:                fallbackText(player.Name, fmt.Sprintf("Player %d", player.ID)),
			Race:                enumName(player.Race, "unknown"),
			Team:                team,
			Observer:            player.Observer,
			StartLocation:       start,
			LastCommandSeconds:  last,
			TotalCommands:       total,
			EffectiveCommands:   effective,
			IneffectiveCommands: total - effective,
			APM:                 apm,
			EAPM:                eapm,
			EffectiveRate:       rate,
			Result:              resultForPlayer(player, winnerTeam),
		})
	}
	return players
}

func normalizeCommands(r *rep.Replay) ([]CommandInfo, []BuildEvent) {
	if r.Commands == nil {
		return []CommandInfo{}, []BuildEvent{}
	}
	names := playerNamesByID(r)
	commands := make([]CommandInfo, 0, len(r.Commands.Cmds))
	builds := []BuildEvent{}
	for index, cmd := range r.Commands.Cmds {
		base := cmd.BaseCmd()
		effective := base.IneffKind.Effective()
		var reason *string
		if !effective {
			reason = strPtr(base.IneffKind.String())
		}
		info := CommandInfo{
			Index:              index,
			Frame:              int32(base.Frame),
			TimeSeconds:        frameSeconds(base.Frame),
			TimeLabel:          base.Frame.String(),
			PlayerID:           int(base.PlayerID),
			PlayerName:         fallbackText(names[base.PlayerID], fmt.Sprintf("Player %d", base.PlayerID)),
			Type:               enumName(base.Type, "unknown"),
			Category:           commandCategory(cmd),
			Details:            fallbackText(safeParams(cmd), ""),
			UnitOrBuilding:     commandUnit(cmd),
			Position:           commandPosition(cmd),
			Effective:          effective,
			InefficiencyReason: reason,
		}
		commands = append(commands, info)
		if event, ok := buildEventFromCommand(info, cmd); ok {
			event.ID = fmt.Sprintf("build-%d", index)
			builds = append(builds, event)
		}
	}
	sort.SliceStable(builds, func(i, j int) bool {
		return builds[i].Frame < builds[j].Frame
	})
	return commands, builds
}

func normalizeTimeline(r *rep.Replay, players []PlayerInfo, interval int) []TimelinePoint {
	if r.Commands == nil || r.Header == nil {
		return []TimelinePoint{}
	}
	duration := int(math.Ceil(r.Header.Duration().Seconds()))
	bucketCount := max(1, int(math.Ceil(float64(duration)/float64(interval))))
	type bucket struct {
		commands  int
		effective int
	}
	data := map[int][]bucket{}
	for _, player := range players {
		if !player.Observer {
			data[player.ID] = make([]bucket, bucketCount)
		}
	}
	for _, cmd := range r.Commands.Cmds {
		base := cmd.BaseCmd()
		buckets, ok := data[int(base.PlayerID)]
		if !ok {
			continue
		}
		index := min(bucketCount-1, max(0, int(frameSeconds(base.Frame))/interval))
		buckets[index].commands++
		if base.IneffKind.Effective() {
			buckets[index].effective++
		}
		data[int(base.PlayerID)] = buckets
	}
	points := []TimelinePoint{}
	for _, player := range players {
		if player.Observer {
			continue
		}
		for index, bucket := range data[player.ID] {
			points = append(points, TimelinePoint{
				PlayerID:     player.ID,
				PlayerName:   player.Name,
				StartSeconds: index * interval,
				EndSeconds:   (index + 1) * interval,
				APM:          round1(float64(bucket.commands) * 60 / float64(interval)),
				EAPM:         round1(float64(bucket.effective) * 60 / float64(interval)),
			})
		}
	}
	return points
}

func normalizeHotkeys(r *rep.Replay, players []PlayerInfo) []HotkeyStat {
	type counts struct{ assigned, added, selected int }
	statsByPlayer := map[int][]counts{}
	for _, player := range players {
		if !player.Observer {
			statsByPlayer[player.ID] = make([]counts, 10)
		}
	}
	if r.Commands != nil {
		for _, cmd := range r.Commands.Cmds {
			hotkey, ok := cmd.(*repcmd.HotkeyCmd)
			if !ok || hotkey.Group > 9 {
				continue
			}
			playerStats, ok := statsByPlayer[int(hotkey.BaseCmd().PlayerID)]
			if !ok {
				continue
			}
			group := int(hotkey.Group)
			switch hotkey.HotkeyType.ID {
			case repcmd.HotkeyTypeIDAssign:
				playerStats[group].assigned++
			case repcmd.HotkeyTypeIDAdd:
				playerStats[group].added++
			case repcmd.HotkeyTypeIDSelect:
				playerStats[group].selected++
			}
		}
	}
	result := []HotkeyStat{}
	for _, player := range players {
		if player.Observer {
			continue
		}
		totalSelected := 0
		for _, item := range statsByPlayer[player.ID] {
			totalSelected += item.selected
		}
		for group, item := range statsByPlayer[player.ID] {
			share := 0.0
			if totalSelected > 0 {
				share = round1(float64(item.selected) * 100 / float64(totalSelected))
			}
			result = append(result, HotkeyStat{
				PlayerID:    player.ID,
				PlayerName:  player.Name,
				Group:       group,
				Assigned:    item.assigned,
				Added:       item.added,
				Selected:    item.selected,
				Total:       item.assigned + item.added + item.selected,
				SelectShare: share,
			})
		}
	}
	return result
}

func attachMostUsedHotkeys(players []PlayerInfo, hotkeys []HotkeyStat) {
	best := map[int]HotkeyStat{}
	for _, stat := range hotkeys {
		current, ok := best[stat.PlayerID]
		if !ok || stat.Total > current.Total {
			best[stat.PlayerID] = stat
		}
	}
	for index := range players {
		if stat, ok := best[players[index].ID]; ok && stat.Total > 0 {
			group := stat.Group
			players[index].MostUsedHotkey = &group
		}
	}
}

func normalizeChat(r *rep.Replay) []ChatMessage {
	if r.Computed == nil {
		return []ChatMessage{}
	}
	slotPlayers := map[byte]string{}
	for _, player := range r.Header.Players {
		slotPlayers[byte(player.SlotID)] = fallbackText(player.Name, fmt.Sprintf("Slot %d", player.SlotID))
	}
	messages := []ChatMessage{}
	seen := map[string]bool{}
	for _, chat := range r.Computed.ChatCmds {
		key := fmt.Sprintf("%d-%d-%s", chat.BaseCmd().Frame, chat.SenderSlotID, chat.Message)
		if seen[key] {
			continue
		}
		seen[key] = true
		messages = append(messages, ChatMessage{
			TimeLabel:  chat.BaseCmd().Frame.String(),
			PlayerName: fallbackText(slotPlayers[chat.SenderSlotID], fmt.Sprintf("Slot %d", chat.SenderSlotID)),
			Message:    fallbackText(chat.Message, ""),
		})
	}
	return messages
}

func generateSemanticAnalysis(players []PlayerInfo, timeline []TimelinePoint, commands []CommandInfo, buildOrder []BuildEvent, hotkeys []HotkeyStat, replay ReplayInfo) SemanticAnalysisResult {
	result := SemanticAnalysisResult{
		Engine:         EngineInfo{Name: "HM AI Rule Engine", Version: hmAIEngineVersion},
		RulesetVersion: hmAIRulesetVersion,
		Status:         "COMPLETED",
		Warnings: []AnalysisWarning{
			{
				Code:     "SCREEN_DATA_ESTIMATED",
				Severity: "INFO",
				Message:  "화면 위치가 완전하게 기록되지 않는 리플레이에서는 멀티태스킹을 화면 전환 기반 추정 지표로만 표시합니다.",
				Context:  map[string]any{"metric": "VIEWPORT_MULTITASKING"},
			},
			{
				Code:     "REQUEST_SCOPED_ANALYSIS",
				Severity: "INFO",
				Message:  "현재 배포 버전은 즉시 분석 모드이며 PostgreSQL, Object Storage, 비동기 Queue 저장은 연결 전 단계입니다.",
				Context:  map[string]any{"source": replay.Source},
			},
		},
	}
	matchup := matchupLabel(players)
	for _, player := range players {
		if player.Observer {
			continue
		}
		classification := classifyOpening(player, matchup, buildOrder)
		result.BuildClassifications = append(result.BuildClassifications, classification)
		result.SemanticEvents = append(result.SemanticEvents, SemanticEvent{
			ID:          stableID("semantic-event", classification.PlayerName, classification.BuildCode),
			EventType:   "BUILD_OPENING_DETECTED",
			Subtype:     classification.BuildCode,
			PlayerID:    &classification.PlayerID,
			PlayerName:  classification.PlayerName,
			StartFrame:  firstEvidenceFrame(classification.Evidence.Frames),
			StartSecond: firstEvidenceSecond(classification.Evidence.Seconds),
			Confidence:  classification.Confidence,
			Evidence:    classification.Evidence,
		})
		result.SkillMetrics = append(result.SkillMetrics, skillMetricsForPlayer(player, timeline, hotkeys, buildOrder)...)
		result.CommandEfficiency = append(result.CommandEfficiency, commandEfficiencyForPlayer(player, timeline, commands))
		result.ProductionReports = append(result.ProductionReports, productionReportForPlayer(player, buildOrder))
		result.HotkeyReports = append(result.HotkeyReports, hotkeyReportForPlayer(player, hotkeys))
		result.MultitaskingReports = append(result.MultitaskingReports, multitaskingReportForPlayer(player, commands))
	}
	result.MapEvents = mapEventsFromBuildOrder(buildOrder)
	if len(result.BuildClassifications) == 0 && len(result.SkillMetrics) == 0 {
		result.Status = "PARTIALLY_COMPLETED"
		result.Warnings = append(result.Warnings, AnalysisWarning{
			Code:     "INSUFFICIENT_COMMAND_DATA",
			Severity: "WARN",
			Message:  "의미 분석에 사용할 수 있는 명령 로그가 충분하지 않습니다.",
			Context:  map[string]any{"commandCount": len(commands)},
		})
	}
	return result
}

func classifyOpening(player PlayerInfo, matchup string, buildOrder []BuildEvent) BuildClassification {
	events := playerBuildEvents(player.ID, buildOrder)
	buildCode, buildName := "OPENING_UNKNOWN", "오프닝 후보 부족"
	confidence := 0.48
	reasonCodes := []string{"INSUFFICIENT_OPENING_EVENTS"}
	var frames []int32
	var seconds []float64
	var units []string
	for _, event := range events {
		if len(frames) < 5 {
			frames = append(frames, event.Frame)
			seconds = append(seconds, event.TimeSeconds)
			units = append(units, event.Label)
		}
	}
	text := strings.ToLower(strings.Join(units, " "))
	switch {
	case strings.Contains(text, "factory") && countLabel(events, "factory") >= 2:
		buildCode, buildName, confidence = "T_2FACT_VULTURE_CANDIDATE", "2 Factory 압박 후보", 0.82
		reasonCodes = []string{"FACTORY_COUNT_GE_2", "EARLY_TECH_SEQUENCE"}
	case strings.Contains(text, "command center"):
		buildCode, buildName, confidence = "T_1FACT_EXPAND_CANDIDATE", "1 Factory Expand 후보", 0.74
		reasonCodes = []string{"COMMAND_CENTER_DETECTED", "EXPANSION_TIMING"}
	case strings.Contains(text, "barracks"):
		buildCode, buildName, confidence = "T_BARRACKS_OPENING", "Barracks Opening", 0.64
		reasonCodes = []string{"BARRACKS_DETECTED"}
	case strings.Contains(text, "nexus"):
		buildCode, buildName, confidence = "P_FAST_NEXUS_CANDIDATE", "Fast Nexus 후보", 0.72
		reasonCodes = []string{"NEXUS_DETECTED", "EXPANSION_TIMING"}
	case strings.Contains(text, "cybernetics core"):
		buildCode, buildName, confidence = "P_GATEWAY_CYBER", "Gateway Cybernetics Core", 0.76
		reasonCodes = []string{"GATEWAY_TECH_DETECTED"}
	case strings.Contains(text, "gateway"):
		buildCode, buildName, confidence = "P_GATEWAY_OPENING", "Gateway Opening", 0.62
		reasonCodes = []string{"GATEWAY_DETECTED"}
	case strings.Contains(text, "hatchery") && !strings.Contains(text, "spawning pool"):
		buildCode, buildName, confidence = "Z_HATCHERY_FIRST_CANDIDATE", "Hatchery First 후보", 0.68
		reasonCodes = []string{"HATCHERY_BEFORE_POOL_CANDIDATE"}
	case strings.Contains(text, "spawning pool"):
		buildCode, buildName, confidence = "Z_POOL_OPENING", "Pool Opening", 0.72
		reasonCodes = []string{"SPAWNING_POOL_DETECTED"}
	}
	confidence = clampConfidence(confidence)
	return BuildClassification{
		PlayerID:   player.ID,
		PlayerName: player.Name,
		Matchup:    matchup,
		BuildCode:  buildCode,
		BuildName:  buildName,
		Confidence: confidence,
		Status:     confidenceStatus(confidence),
		AlternativeBuilds: []AlternativeBuild{
			{BuildCode: "STANDARD_OPENING", BuildName: "표준 오프닝 후보", Confidence: round2(math.Max(0.05, confidence-0.28))},
		},
		Evidence: AnalysisEvidence{
			Confidence:  confidence,
			CommandIDs:  buildEventIDs(events, 5),
			Frames:      frames,
			Seconds:     seconds,
			UnitTypes:   units,
			ReasonCodes: reasonCodes,
			Explanation: fmt.Sprintf("%s의 초반 건물·유닛·테크 명령 %d개를 기준으로 판정했습니다.", player.Name, len(events)),
			Benchmark:   insufficientBenchmark(matchup),
		},
		ClassifierVersion: "opening-classifier/0.2.0",
	}
}

func skillMetricsForPlayer(player PlayerInfo, timeline []TimelinePoint, hotkeys []HotkeyStat, buildOrder []BuildEvent) []SkillMetric {
	effectiveRate := 0.0
	confidence := 0.52
	if player.EffectiveRate != nil {
		effectiveRate = *player.EffectiveRate
		confidence = 0.86
	}
	hotkeyBreadth := len(usedHotkeyGroups(player.ID, hotkeys))
	production := productionReportForPlayer(player, buildOrder)
	lateDrop := lateGameEfficiencyDrop(player.ID, timeline)
	return []SkillMetric{
		{
			PlayerID:        player.ID,
			PlayerName:      player.Name,
			MetricType:      "COMMAND_REDUNDANCY",
			Label:           "명령 중복률",
			RawValue:        round1(100 - effectiveRate),
			Unit:            "%",
			NormalizedScore: boundedScore(effectiveRate),
			SampleSize:      player.TotalCommands,
			BenchmarkGroup:  "비교 데이터 부족",
			Confidence:      confidence,
			Evidence:        evidenceFromText(confidence, []string{"APM_EAPM_GAP", "INEFFECTIVE_COMMANDS"}, fmt.Sprintf("총 명령 %d개 중 비효율 명령 %d개를 기준으로 계산했습니다.", player.TotalCommands, player.IneffectiveCommands)),
			MetricVersion:   "command-efficiency/0.2.0",
		},
		{
			PlayerID:        player.ID,
			PlayerName:      player.Name,
			MetricType:      "HOTKEY_BREADTH",
			Label:           "단축키 폭",
			RawValue:        float64(hotkeyBreadth),
			Unit:            "groups",
			NormalizedScore: boundedScore(float64(hotkeyBreadth) * 10),
			SampleSize:      hotkeyTotal(player.ID, hotkeys),
			BenchmarkGroup:  "비교 데이터 부족",
			Confidence:      0.78,
			Evidence:        evidenceFromText(0.78, []string{"HOTKEY_GROUP_USAGE"}, fmt.Sprintf("사용한 부대번호 %d개를 기준으로 계산했습니다.", hotkeyBreadth)),
			MetricVersion:   "hotkey-analysis/0.2.0",
		},
		{
			PlayerID:        player.ID,
			PlayerName:      player.Name,
			MetricType:      "PRODUCTION_CADENCE",
			Label:           "생산 안정성",
			RawValue:        float64(production.StabilityScore),
			Unit:            "score",
			NormalizedScore: production.StabilityScore,
			SampleSize:      production.ProductionEvents,
			BenchmarkGroup:  "비교 데이터 부족",
			Confidence:      0.64,
			Evidence:        production.Evidence,
			MetricVersion:   "production-cadence/0.2.0",
		},
		{
			PlayerID:        player.ID,
			PlayerName:      player.Name,
			MetricType:      "LATE_GAME_EFFICIENCY_DROP",
			Label:           "후반 효율 변화",
			RawValue:        lateDrop,
			Unit:            "pp",
			NormalizedScore: boundedScore(100 - math.Max(0, lateDrop)),
			SampleSize:      len(playerTimeline(player.ID, timeline)),
			BenchmarkGroup:  "비교 데이터 부족",
			Confidence:      0.58,
			Evidence:        evidenceFromText(0.58, []string{"TIMELINE_SEGMENT_COMPARE"}, "경기 구간별 APM/EAPM 차이를 비교한 추정 지표입니다."),
			MetricVersion:   "timeline-efficiency/0.2.0",
		},
	}
}

func commandEfficiencyForPlayer(player PlayerInfo, timeline []TimelinePoint, commands []CommandInfo) CommandEfficiencyReport {
	return CommandEfficiencyReport{
		PlayerID:                 player.ID,
		PlayerName:               player.Name,
		APM:                      player.APM,
		EAPM:                     player.EAPM,
		EffectiveRate:            player.EffectiveRate,
		IneffectiveCommands:      player.IneffectiveCommands,
		RepeatedCommandCandidate: repeatedCommandCandidates(player.ID, commands),
		SegmentEfficiency:        segmentMetrics(player.ID, timeline),
		Evidence:                 evidenceFromText(0.86, []string{"TOTAL_COMMANDS", "EFFECTIVE_COMMANDS", "TIMELINE_BUCKETS"}, fmt.Sprintf("총 명령 %d개, 유효 명령 %d개, 비효율 명령 %d개를 사용했습니다.", player.TotalCommands, player.EffectiveCommands, player.IneffectiveCommands)),
	}
}

func productionReportForPlayer(player PlayerInfo, buildOrder []BuildEvent) ProductionReport {
	events := playerBuildEvents(player.ID, buildOrder)
	gaps := productionGaps(events)
	longestGap := 0.0
	for _, gap := range gaps {
		if gap.Duration > longestGap {
			longestGap = gap.Duration
		}
	}
	score := boundedScore(100 - math.Min(60, longestGap))
	return ProductionReport{
		PlayerID:         player.ID,
		PlayerName:       player.Name,
		ProductionEvents: len(events),
		ProductionGaps:   gaps,
		StabilityScore:   score,
		Evidence: AnalysisEvidence{
			Confidence:  0.64,
			CommandIDs:  buildEventIDs(events, 8),
			Frames:      buildEventFrames(events, 8),
			Seconds:     buildEventSeconds(events, 8),
			UnitTypes:   buildEventLabels(events, 8),
			ReasonCodes: []string{"PRODUCTION_EVENT_GAPS", "BUILD_ORDER_TIMING"},
			Explanation: fmt.Sprintf("생산·건설·테크 이벤트 %d개와 가장 긴 공백 %.1f초를 기준으로 계산했습니다.", len(events), longestGap),
			Benchmark:   insufficientBenchmark("HM AI 전체"),
		},
	}
}

func hotkeyReportForPlayer(player PlayerInfo, hotkeys []HotkeyStat) HotkeyReport {
	groups := usedHotkeyGroups(player.ID, hotkeys)
	dominant, dominantShare := dominantHotkey(player.ID, hotkeys)
	return HotkeyReport{
		PlayerID:         player.ID,
		PlayerName:       player.Name,
		UsedGroups:       groups,
		BreadthScore:     boundedScore(float64(len(groups)) * 10),
		ConsistencyScore: boundedScore(100 - dominantShare/2),
		DominantGroup:    dominant,
		DominantShare:    dominantShare,
		Evidence:         evidenceFromText(0.78, []string{"HOTKEY_ASSIGN", "HOTKEY_SELECT", "DOMINANT_GROUP"}, fmt.Sprintf("부대번호 %d개 사용, 최다 호출 비중 %.1f%%를 기준으로 계산했습니다.", len(groups), dominantShare)),
	}
}

func multitaskingReportForPlayer(player PlayerInfo, commands []CommandInfo) MultitaskingReport {
	positioned := positionedCommands(player.ID, commands)
	switches := regionSwitches(player.ID, commands)
	return MultitaskingReport{
		PlayerID:             player.ID,
		PlayerName:           player.Name,
		PositionedCommands:   positioned,
		RegionSwitchEstimate: switches,
		Confidence:           0.46,
		Qualifier:            "화면 전환 기반 추정 지표",
		Evidence:             evidenceFromText(0.46, []string{"POSITIONED_COMMANDS", "REGION_SWITCH_ESTIMATE", "SCREEN_DATA_LIMITED"}, fmt.Sprintf("좌표가 포함된 명령 %d개와 지역 전환 후보 %d회를 기준으로 추정했습니다.", positioned, switches)),
	}
}

func mapEventsFromBuildOrder(buildOrder []BuildEvent) []MapSemanticEvent {
	events := []MapSemanticEvent{}
	for _, event := range buildOrder {
		if event.Position == nil {
			continue
		}
		events = append(events, MapSemanticEvent{
			ID:          stableID("map-event", event.ID),
			EventType:   "BUILDING_POSITION",
			PlayerID:    event.PlayerID,
			PlayerName:  event.PlayerName,
			Position:    event.Position,
			StartSecond: event.TimeSeconds,
			Confidence:  0.82,
			Evidence: AnalysisEvidence{
				Confidence:  0.82,
				CommandIDs:  []string{event.ID},
				Frames:      []int32{event.Frame},
				Seconds:     []float64{event.TimeSeconds},
				Positions:   []Point{*event.Position},
				ReasonCodes: []string{"BUILD_COMMAND_POSITION"},
				Explanation: fmt.Sprintf("%s의 %s 좌표를 명령 로그에서 확인했습니다.", event.PlayerName, event.Label),
			},
		})
		if len(events) >= 18 {
			break
		}
	}
	return events
}

func generateAnalysis(result *SuccessResponse) AnalysisReport {
	sections := []AnalysisSection{
		{Title: "경기 요약", Items: []AnalysisItem{}},
		{Title: "승리 이유", Items: []AnalysisItem{}},
		{Title: "오프닝 판정", Items: []AnalysisItem{}},
		{Title: "개선 후보", Items: []AnalysisItem{}},
	}
	for _, player := range result.Players {
		if player.Observer {
			continue
		}
		rate := "unknown"
		if player.EffectiveRate != nil {
			rate = fmt.Sprintf("%.1f%%", *player.EffectiveRate)
		}
		sections[0].Items = append(sections[0].Items, AnalysisItem{
			Text:     fmt.Sprintf("%s의 평균 APM은 %s, EAPM은 %s이며 유효 명령률은 %s입니다.", player.Name, intText(player.APM), intText(player.EAPM), rate),
			Evidence: strPtr(fmt.Sprintf("총 명령 %d개, 유효 명령 %d개", player.TotalCommands, player.EffectiveCommands)),
		})
		if player.EffectiveRate != nil && *player.EffectiveRate < 65 {
			sections[3].Items = append(sections[3].Items, AnalysisItem{
				Text:     fmt.Sprintf("%s는 마우스 클릭 수에 비해 경기에 도움 된 명령이 적었습니다. 반복 클릭보다 생산, 공격, 후퇴, 정찰처럼 결과를 바꾸는 명령을 남기는 연습이 필요합니다.", player.Name),
				Evidence: strPtr(fmt.Sprintf("비효율 명령 %d개", player.IneffectiveCommands)),
			})
		}
	}
	for _, pattern := range result.Coaching.VictoryPatterns {
		sections[1].Items = append(sections[1].Items, AnalysisItem{
			Text:     fmt.Sprintf("%s: %s %s", pattern.WinnerName, pattern.Title, pattern.WhyItWon),
			Evidence: strPtr(pattern.CoachingUse),
		})
		if len(sections[1].Items) >= 5 {
			break
		}
	}
	for _, item := range result.Semantic.BuildClassifications {
		if item.Confidence < confidencePolicy().HideBelow {
			continue
		}
		sections[2].Items = append(sections[2].Items, AnalysisItem{
			Text:     fmt.Sprintf("%s: %s", item.PlayerName, item.BuildName),
			Evidence: strPtr(fmt.Sprintf("신뢰도 %.0f%% · 근거 %s", item.Confidence*100, strings.Join(item.Evidence.ReasonCodes, ", "))),
		})
	}
	for _, event := range result.BuildOrder {
		if len(sections[3].Items) >= 8 {
			break
		}
		if event.Category == "building" || event.Category == "tech" || event.Category == "upgrade" {
			sections[3].Items = append(sections[3].Items, AnalysisItem{
				Text:     fmt.Sprintf("%s: %s에 %s", event.PlayerName, event.TimeLabel, event.Label),
				Evidence: strPtr(fmt.Sprintf("프레임 %d", event.Frame)),
			})
		}
	}
	for index := range sections {
		if len(sections[index].Items) == 0 {
			sections[index].Items = []AnalysisItem{{Text: "이 항목을 평가하기에는 리플레이 데이터가 충분하지 않습니다."}}
		}
	}
	return AnalysisReport{
		Sections: sections,
		Cautions: []string{
			"일부 경기 결과는 플레이어의 게임 이탈 순서와 리플레이 명령을 기준으로 추정될 수 있습니다.",
			"이 리포트는 명령 로그에서 확인 가능한 항목만 해석합니다.",
			"공개되거나 HM AI 분석툴에 수집된 리플레이를 기준으로 집계된 기록입니다.",
		},
	}
}

func matchupLabel(players []PlayerInfo) string {
	races := []string{}
	for _, player := range players {
		if player.Observer {
			continue
		}
		race := strings.ToLower(player.Race)
		switch {
		case strings.Contains(race, "terran"):
			races = append(races, "T")
		case strings.Contains(race, "protoss"):
			races = append(races, "P")
		case strings.Contains(race, "zerg"):
			races = append(races, "Z")
		default:
			races = append(races, "?")
		}
	}
	sort.Strings(races)
	if len(races) == 0 {
		return "UNKNOWN"
	}
	return strings.Join(races, "v")
}

func playerBuildEvents(playerID int, buildOrder []BuildEvent) []BuildEvent {
	events := []BuildEvent{}
	for _, event := range buildOrder {
		if event.PlayerID == playerID && (event.Category == "building" || event.Category == "unit" || event.Category == "tech" || event.Category == "upgrade") {
			events = append(events, event)
		}
	}
	sort.SliceStable(events, func(i, j int) bool {
		return events[i].TimeSeconds < events[j].TimeSeconds
	})
	return events
}

func countLabel(events []BuildEvent, contains string) int {
	count := 0
	for _, event := range events {
		if strings.Contains(strings.ToLower(event.Label), contains) {
			count++
		}
	}
	return count
}

func confidenceStatus(value float64) string {
	policy := confidencePolicy()
	switch {
	case value >= policy.High:
		return "INFERRED_HIGH"
	case value >= policy.Medium:
		return "INFERRED_MEDIUM"
	case value >= policy.Low:
		return "INFERRED_LOW"
	default:
		return "UNKNOWN"
	}
}

func clampConfidence(value float64) float64 {
	return math.Max(0, math.Min(1, round2(value)))
}

func insufficientBenchmark(group string) *EvidenceBenchmark {
	return &EvidenceBenchmark{Group: group, SampleSize: 0}
}

func evidenceFromText(confidence float64, reasonCodes []string, explanation string) AnalysisEvidence {
	return AnalysisEvidence{
		Confidence:  clampConfidence(confidence),
		ReasonCodes: reasonCodes,
		Explanation: explanation,
		Benchmark:   insufficientBenchmark("비교 데이터 부족"),
	}
}

func buildEventIDs(events []BuildEvent, limit int) []string {
	ids := []string{}
	for _, event := range events {
		ids = append(ids, event.ID)
		if len(ids) >= limit {
			break
		}
	}
	return ids
}

func buildEventFrames(events []BuildEvent, limit int) []int32 {
	frames := []int32{}
	for _, event := range events {
		frames = append(frames, event.Frame)
		if len(frames) >= limit {
			break
		}
	}
	return frames
}

func buildEventSeconds(events []BuildEvent, limit int) []float64 {
	seconds := []float64{}
	for _, event := range events {
		seconds = append(seconds, event.TimeSeconds)
		if len(seconds) >= limit {
			break
		}
	}
	return seconds
}

func buildEventLabels(events []BuildEvent, limit int) []string {
	labels := []string{}
	for _, event := range events {
		labels = append(labels, event.Label)
		if len(labels) >= limit {
			break
		}
	}
	return labels
}

func firstEvidenceFrame(frames []int32) int32 {
	if len(frames) == 0 {
		return 0
	}
	return frames[0]
}

func firstEvidenceSecond(seconds []float64) float64 {
	if len(seconds) == 0 {
		return 0
	}
	return seconds[0]
}

func boundedScore(value float64) int {
	return int(math.Round(math.Max(0, math.Min(100, value))))
}

func usedHotkeyGroups(playerID int, hotkeys []HotkeyStat) []int {
	groups := []int{}
	for _, stat := range hotkeys {
		if stat.PlayerID == playerID && stat.Total > 0 {
			groups = append(groups, stat.Group)
		}
	}
	return groups
}

func hotkeyTotal(playerID int, hotkeys []HotkeyStat) int {
	total := 0
	for _, stat := range hotkeys {
		if stat.PlayerID == playerID {
			total += stat.Total
		}
	}
	return total
}

func dominantHotkey(playerID int, hotkeys []HotkeyStat) (*int, float64) {
	total := hotkeyTotal(playerID, hotkeys)
	if total == 0 {
		return nil, 0
	}
	bestGroup, bestCount := 0, 0
	for _, stat := range hotkeys {
		if stat.PlayerID == playerID && stat.Total > bestCount {
			bestGroup, bestCount = stat.Group, stat.Total
		}
	}
	share := round1(float64(bestCount) * 100 / float64(total))
	return &bestGroup, share
}

func playerTimeline(playerID int, timeline []TimelinePoint) []TimelinePoint {
	points := []TimelinePoint{}
	for _, point := range timeline {
		if point.PlayerID == playerID {
			points = append(points, point)
		}
	}
	sort.SliceStable(points, func(i, j int) bool {
		return points[i].StartSeconds < points[j].StartSeconds
	})
	return points
}

func lateGameEfficiencyDrop(playerID int, timeline []TimelinePoint) float64 {
	points := playerTimeline(playerID, timeline)
	if len(points) < 3 {
		return 0
	}
	first, last := points[0], points[len(points)-1]
	firstRate := 0.0
	lastRate := 0.0
	if first.APM > 0 {
		firstRate = first.EAPM * 100 / first.APM
	}
	if last.APM > 0 {
		lastRate = last.EAPM * 100 / last.APM
	}
	return round1(firstRate - lastRate)
}

func segmentMetrics(playerID int, timeline []TimelinePoint) []SegmentMetric {
	points := playerTimeline(playerID, timeline)
	if len(points) == 0 {
		return []SegmentMetric{}
	}
	segments := []SegmentMetric{}
	labels := []string{"초반", "중반", "후반"}
	chunk := int(math.Ceil(float64(len(points)) / 3.0))
	for index, label := range labels {
		start := index * chunk
		if start >= len(points) {
			break
		}
		end := min(len(points), start+chunk)
		slice := points[start:end]
		apm, eapm := 0.0, 0.0
		for _, point := range slice {
			apm += point.APM
			eapm += point.EAPM
		}
		apm = round1(apm / float64(len(slice)))
		eapm = round1(eapm / float64(len(slice)))
		var rate *float64
		if apm > 0 {
			value := round1(eapm * 100 / apm)
			rate = &value
		}
		segments = append(segments, SegmentMetric{
			Segment:       label,
			StartSecond:   slice[0].StartSeconds,
			EndSecond:     slice[len(slice)-1].EndSeconds,
			APM:           apm,
			EAPM:          eapm,
			EffectiveRate: rate,
		})
	}
	return segments
}

func repeatedCommandCandidates(playerID int, commands []CommandInfo) int {
	count := 0
	var previous *CommandInfo
	for index := range commands {
		cmd := commands[index]
		if cmd.PlayerID != playerID {
			continue
		}
		if previous != nil && cmd.Type == previous.Type && cmd.Category == previous.Category && math.Abs(cmd.TimeSeconds-previous.TimeSeconds) <= 0.4 {
			count++
		}
		previous = &cmd
	}
	return count
}

func productionGaps(events []BuildEvent) []ProductionGap {
	gaps := []ProductionGap{}
	if len(events) < 2 {
		return gaps
	}
	for index := 1; index < len(events); index++ {
		gap := round1(events[index].TimeSeconds - events[index-1].TimeSeconds)
		if gap >= 35 {
			gaps = append(gaps, ProductionGap{
				StartSecond: events[index-1].TimeSeconds,
				EndSecond:   events[index].TimeSeconds,
				Duration:    gap,
				ReasonCode:  "PRODUCTION_EVENT_GAP_GE_35S",
			})
		}
		if len(gaps) >= 5 {
			break
		}
	}
	return gaps
}

func positionedCommands(playerID int, commands []CommandInfo) int {
	count := 0
	for _, cmd := range commands {
		if cmd.PlayerID == playerID && cmd.Position != nil {
			count++
		}
	}
	return count
}

func regionSwitches(playerID int, commands []CommandInfo) int {
	switches := 0
	var previous *Point
	for index := range commands {
		cmd := commands[index]
		if cmd.PlayerID != playerID || cmd.Position == nil {
			continue
		}
		if previous != nil && distance(*previous, *cmd.Position) >= 48 {
			switches++
		}
		current := *cmd.Position
		previous = &current
	}
	return switches
}

func distance(a, b Point) float64 {
	return math.Hypot(float64(a.X-b.X), float64(a.Y-b.Y))
}

func readBinarySignature(path string) string {
	file, err := os.Open(path)
	if err != nil {
		return "unavailable"
	}
	defer file.Close()
	buf := make([]byte, 8)
	n, err := io.ReadFull(file, buf)
	if err != nil && n == 0 {
		return "unavailable"
	}
	return strings.ToUpper(hex.EncodeToString(buf[:n]))
}

func stableID(prefix string, parts ...string) string {
	hash := sha256.Sum256([]byte(strings.Join(parts, "|")))
	return fmt.Sprintf("%s_%s", prefix, hex.EncodeToString(hash[:])[:16])
}

func round2(value float64) float64 {
	return math.Round(value*100) / 100
}

func playerDesc(r *rep.Replay, playerID byte) *rep.PlayerDesc {
	if r.Computed == nil || r.Computed.PIDPlayerDescs == nil {
		return nil
	}
	return r.Computed.PIDPlayerDescs[playerID]
}

func playerNamesByID(r *rep.Replay) map[byte]string {
	names := map[byte]string{}
	for _, player := range r.Header.Players {
		names[player.ID] = fallbackText(player.Name, fmt.Sprintf("Player %d", player.ID))
	}
	return names
}

func resultForPlayer(player *rep.Player, winnerTeam byte) PlayerResult {
	if winnerTeam == 0 || player.Observer {
		return PlayerResult{Outcome: "UNKNOWN", Status: "UNKNOWN"}
	}
	if player.Team == winnerTeam {
		return PlayerResult{Outcome: "WIN", Status: "INFERRED_MEDIUM"}
	}
	return PlayerResult{Outcome: "LOSS", Status: "INFERRED_MEDIUM"}
}

func resultConfidence(r *rep.Replay) string {
	if r.Computed != nil && r.Computed.WinnerTeam != 0 {
		return "INFERRED_MEDIUM"
	}
	return "UNKNOWN"
}

func commandCategory(cmd repcmd.Cmd) string {
	switch cmd.BaseCmd().Type.ID {
	case repcmd.TypeIDTrain, repcmd.TypeIDTrainFighter, repcmd.TypeIDUnitMorph:
		return "unit"
	case repcmd.TypeIDBuild, repcmd.VirtualTypeIDLand, repcmd.TypeIDBuildingMorph:
		return "building"
	case repcmd.TypeIDHotkey:
		return "hotkey"
	case repcmd.TypeIDSelect, repcmd.TypeIDSelectAdd, repcmd.TypeIDSelectRemove, repcmd.TypeIDSelect121, repcmd.TypeIDSelectAdd121, repcmd.TypeIDSelectRemove121:
		return "selection"
	case repcmd.TypeIDRightClick, repcmd.TypeIDRightClick121:
		return "movement"
	case repcmd.TypeIDTech:
		return "tech"
	case repcmd.TypeIDUpgrade:
		return "upgrade"
	case repcmd.TypeIDCancelBuild, repcmd.TypeIDCancelMorph, repcmd.TypeIDCancelTrain, repcmd.TypeIDCancelNuke, repcmd.TypeIDCancelTech, repcmd.TypeIDCancelUpgrade, repcmd.TypeIDCancelAddon:
		return "cancel"
	default:
		return "other"
	}
}

func buildEventFromCommand(info CommandInfo, cmd repcmd.Cmd) (BuildEvent, bool) {
	event := BuildEvent{
		Frame:       info.Frame,
		TimeSeconds: info.TimeSeconds,
		TimeLabel:   info.TimeLabel,
		PlayerID:    info.PlayerID,
		PlayerName:  info.PlayerName,
		Position:    info.Position,
	}
	switch item := cmd.(type) {
	case *repcmd.BuildCmd:
		event.Category = "building"
		event.Label = fmt.Sprintf("%s 건설", enumName(item.Unit, "Unknown"))
	case *repcmd.TrainCmd:
		event.Category = "unit"
		event.Label = fmt.Sprintf("%s 생산", enumName(item.Unit, "Unknown"))
	case *repcmd.BuildingMorphCmd:
		event.Category = "building"
		event.Label = fmt.Sprintf("%s 변태", enumName(item.Unit, "Unknown"))
	case *repcmd.TechCmd:
		event.Category = "tech"
		event.Label = fmt.Sprintf("%s 연구", enumName(item.Tech, "Unknown"))
	case *repcmd.UpgradeCmd:
		event.Category = "upgrade"
		event.Label = fmt.Sprintf("%s 업그레이드", enumName(item.Upgrade, "Unknown"))
	default:
		if info.Category != "cancel" {
			return BuildEvent{}, false
		}
		event.Category = "cancel"
		event.Label = info.Type
	}
	return event, true
}

func commandPosition(cmd repcmd.Cmd) *Point {
	switch item := cmd.(type) {
	case *repcmd.BuildCmd:
		return pointFromCore(item.Pos)
	case *repcmd.LandCmd:
		return pointFromCore(item.Pos)
	case *repcmd.RightClickCmd:
		return pointFromCore(item.Pos)
	case *repcmd.TargetedOrderCmd:
		return pointFromCore(item.Pos)
	case *repcmd.MinimapPingCmd:
		return pointFromCore(item.Pos)
	default:
		return nil
	}
}

func commandUnit(cmd repcmd.Cmd) *string {
	switch item := cmd.(type) {
	case *repcmd.BuildCmd:
		return stringerPtr(item.Unit)
	case *repcmd.TrainCmd:
		return stringerPtr(item.Unit)
	case *repcmd.BuildingMorphCmd:
		return stringerPtr(item.Unit)
	case *repcmd.RightClickCmd:
		return stringerPtr(item.Unit)
	case *repcmd.TargetedOrderCmd:
		return stringerPtr(item.Unit)
	default:
		return nil
	}
}

func safeParams(cmd repcmd.Cmd) (text string) {
	defer func() {
		if recover() != nil {
			text = ""
		}
	}()
	return cleanText(cmd.Params(false))
}

func enumName(value fmt.Stringer, fallback string) string {
	if value == nil || isNilStringer(value) {
		return fallback
	}
	return fallbackText(value.String(), fallback)
}

func stringerPtr(value fmt.Stringer) *string {
	if value == nil || isNilStringer(value) {
		return nil
	}
	text := cleanText(value.String())
	if text == "" || strings.HasPrefix(strings.ToLower(text), "unknown") {
		return nil
	}
	return &text
}

func isNilStringer(value fmt.Stringer) bool {
	v := reflect.ValueOf(value)
	switch v.Kind() {
	case reflect.Chan, reflect.Func, reflect.Interface, reflect.Map, reflect.Pointer, reflect.Slice:
		return v.IsNil()
	default:
		return false
	}
}

func pointFromCore(point repcore.Point) *Point {
	return &Point{X: int(point.X), Y: int(point.Y)}
}

func frameSeconds(frame repcore.Frame) float64 {
	return round1(frame.Seconds())
}

func cleanPtr(value string) *string {
	cleaned := cleanText(value)
	if cleaned == "" {
		return nil
	}
	return &cleaned
}

func fallbackText(value, fallback string) string {
	cleaned := cleanText(value)
	if cleaned == "" {
		return fallback
	}
	return cleaned
}

func cleanText(value string) string {
	return strings.TrimSpace(strings.Map(func(r rune) rune {
		if r < 32 || r == 127 {
			return -1
		}
		return r
	}, value))
}

func strPtr(value string) *string {
	return &value
}

func intText(value *int) string {
	if value == nil {
		return "unknown"
	}
	return fmt.Sprint(*value)
}

func round1(value float64) float64 {
	return math.Round(value*10) / 10
}
