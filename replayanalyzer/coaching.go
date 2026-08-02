package replayanalyzer

import (
	"fmt"
	"math"
	"sort"
	"strings"
)

type CoachingAnalysis struct {
	Scope            CoachingScope       `json:"scope"`
	Facts            []ReplayFact        `json:"facts"`
	Issues           []DetectedIssue     `json:"issues"`
	Findings         []CoachFinding      `json:"findings"`
	KnowledgeMatches []KnowledgeMatch    `json:"knowledgeMatches"`
	Review           CoachingReviewState `json:"review"`
}

type CoachingScope struct {
	Headline       string   `json:"headline"`
	Matchup        string   `json:"matchup"`
	MapName        string   `json:"mapName"`
	Phase          string   `json:"phase"`
	DataTypes      []string `json:"dataTypes"`
	Confidence     float64  `json:"confidence"`
	Limitations    []string `json:"limitations"`
	KnowledgeState []string `json:"knowledgeState"`
}

type ReplayFact struct {
	ID           string         `json:"id"`
	TimeMs       int64          `json:"timeMs"`
	EndTimeMs    *int64         `json:"endTimeMs,omitempty"`
	PlayerID     *string        `json:"playerId,omitempty"`
	OpponentID   *string        `json:"opponentId,omitempty"`
	Category     string         `json:"category"`
	Type         string         `json:"type"`
	Label        string         `json:"label"`
	Source       string         `json:"source"`
	Visibility   string         `json:"visibility"`
	Confidence   float64        `json:"confidence"`
	X            *int           `json:"x,omitempty"`
	Y            *int           `json:"y,omitempty"`
	UnitType     *string        `json:"unitType,omitempty"`
	BuildingType *string        `json:"buildingType,omitempty"`
	Value        *float64       `json:"value,omitempty"`
	RawEventIDs  []string       `json:"rawEventIds,omitempty"`
	Metadata     map[string]any `json:"metadata,omitempty"`
}

type DetectedIssue struct {
	ID              string         `json:"id"`
	Category        string         `json:"category"`
	Severity        string         `json:"severity"`
	Title           string         `json:"title"`
	Description     string         `json:"description"`
	PlayerID        string         `json:"playerId"`
	StartTimeMs     int64          `json:"startTimeMs"`
	EndTimeMs       *int64         `json:"endTimeMs,omitempty"`
	EvidenceIDs     []string       `json:"evidenceIds"`
	Confidence      float64        `json:"confidence"`
	MeasurableValue *float64       `json:"measurableValue,omitempty"`
	ExpectedRange   *ExpectedRange `json:"expectedRange,omitempty"`
}

type ExpectedRange struct {
	Min  *float64 `json:"min,omitempty"`
	Max  *float64 `json:"max,omitempty"`
	Unit string   `json:"unit,omitempty"`
}

type CoachingKnowledge struct {
	ID           string   `json:"id"`
	Title        string   `json:"title"`
	Content      string   `json:"content"`
	SourceType   string   `json:"sourceType"`
	SourceTitle  string   `json:"sourceTitle,omitempty"`
	SourceURL    string   `json:"sourceUrl,omitempty"`
	Author       string   `json:"author,omitempty"`
	Matchup      string   `json:"matchup,omitempty"`
	PlayerRace   string   `json:"playerRace,omitempty"`
	OpponentRace string   `json:"opponentRace,omitempty"`
	Maps         []string `json:"maps,omitempty"`
	BuildTags    []string `json:"buildTags,omitempty"`
	Phase        string   `json:"phase,omitempty"`
	Categories   []string `json:"categories,omitempty"`
	Status       string   `json:"status"`
	CreatedAt    string   `json:"createdAt"`
	UpdatedAt    string   `json:"updatedAt"`
}

type KnowledgeMatch struct {
	KnowledgeID string  `json:"knowledgeId"`
	Title       string  `json:"title"`
	Score       float64 `json:"score"`
	Reason      string  `json:"reason"`
}

type CoachFinding struct {
	ID           string   `json:"id"`
	Severity     string   `json:"severity"`
	Category     string   `json:"category"`
	Title        string   `json:"title"`
	Summary      string   `json:"summary"`
	WhyItMatters string   `json:"whyItMatters"`
	NextAction   string   `json:"nextAction"`
	StartTimeMs  int64    `json:"startTimeMs"`
	EndTimeMs    *int64   `json:"endTimeMs,omitempty"`
	EvidenceIDs  []string `json:"evidenceIds"`
	KnowledgeIDs []string `json:"knowledgeIds"`
	Confidence   float64  `json:"confidence"`
	Limitations  []string `json:"limitations,omitempty"`
}

type CoachingReviewState struct {
	Status       string `json:"status"`
	Badge        string `json:"badge"`
	CanPersist   bool   `json:"canPersist"`
	StorageState string `json:"storageState"`
}

type KnowledgeRepository interface {
	Search(matchup string, phase string, mapName string, categories []string) []KnowledgeMatch
}

type seedKnowledgeRepository struct {
	items []CoachingKnowledge
}

func generateCoachingAnalysis(players []PlayerInfo, commands []CommandInfo, buildOrder []BuildEvent, hotkeys []HotkeyStat, timeline []TimelinePoint, replay ReplayInfo, semantic SemanticAnalysisResult) CoachingAnalysis {
	facts := buildReplayFacts(players, commands, buildOrder, hotkeys, timeline, replay)
	issues := detectMeasuredIssues(players, commands, buildOrder, hotkeys, timeline, semantic, facts)
	scope := buildCoachingScope(players, replay, facts)
	repository := seedKnowledgeRepository{items: seedCoachingKnowledge()}
	categories := issueCategories(issues)
	knowledge := repository.Search(scope.Matchup, scope.Phase, scope.MapName, categories)
	findings := buildCoachFindings(issues, knowledge, factIDSet(facts))
	return CoachingAnalysis{
		Scope:            scope,
		Facts:            facts,
		Issues:           issues,
		Findings:         findings,
		KnowledgeMatches: knowledge,
		Review: CoachingReviewState{
			Status:       "unreviewed",
			Badge:        "AI 분석",
			CanPersist:   false,
			StorageState: "DB 환경변수가 없어 코치 수정본 저장은 비활성화되어 있습니다.",
		},
	}
}

func buildReplayFacts(players []PlayerInfo, commands []CommandInfo, buildOrder []BuildEvent, hotkeys []HotkeyStat, timeline []TimelinePoint, replay ReplayInfo) []ReplayFact {
	facts := []ReplayFact{
		{
			ID:         "fact-replay-header",
			TimeMs:     0,
			Category:   "strategy",
			Type:       "replay_header",
			Label:      fallbackText(replay.GameType, "경기 정보"),
			Source:     "replay_header",
			Visibility: "omniscient",
			Confidence: 0.95,
			Metadata: map[string]any{
				"map":      derefString(replay.Map.Name, "Unknown map"),
				"duration": replay.DurationSecs,
			},
		},
	}
	if replay.Map.Name != nil || replay.Map.Width != nil || replay.Map.Height != nil {
		facts = append(facts, ReplayFact{
			ID:         "fact-map",
			TimeMs:     0,
			Category:   "map_position",
			Type:       "map",
			Label:      derefString(replay.Map.Name, "맵 정보"),
			Source:     "map",
			Visibility: "omniscient",
			Confidence: 0.86,
			Metadata: map[string]any{
				"width":   replay.Map.Width,
				"height":  replay.Map.Height,
				"tileset": replay.Map.Tileset,
			},
		})
	}
	for _, player := range players {
		if player.Observer {
			continue
		}
		playerID := fmt.Sprint(player.ID)
		fact := ReplayFact{
			ID:         stableID("fact-player", playerID, player.Name),
			TimeMs:     0,
			PlayerID:   &playerID,
			Category:   "strategy",
			Type:       "player",
			Label:      fmt.Sprintf("%s · %s", player.Name, player.Race),
			Source:     "replay_header",
			Visibility: "omniscient",
			Confidence: 0.9,
		}
		if player.StartLocation != nil {
			fact.X = &player.StartLocation.X
			fact.Y = &player.StartLocation.Y
		}
		facts = append(facts, fact)
	}
	for _, cmd := range commands {
		fact := factFromCommand(cmd)
		facts = append(facts, fact)
	}
	for _, event := range buildOrder {
		facts = append(facts, factFromBuildEvent(event))
	}
	for _, point := range timeline {
		playerID := fmt.Sprint(point.PlayerID)
		value := point.EAPM
		endMs := int64(point.EndSeconds) * 1000
		facts = append(facts, ReplayFact{
			ID:         timelineFactID(point.PlayerID, point.StartSeconds, point.EndSeconds),
			TimeMs:     int64(point.StartSeconds) * 1000,
			EndTimeMs:  &endMs,
			PlayerID:   &playerID,
			Category:   "control",
			Type:       "timeline_segment",
			Label:      fmt.Sprintf("%s-%s 분당 명령 %0.0f / 분당 유효 명령 %0.0f", formatSeconds(point.StartSeconds), formatSeconds(point.EndSeconds), point.APM, point.EAPM),
			Source:     "derived",
			Visibility: "omniscient",
			Confidence: 0.7,
			Value:      &value,
			Metadata: map[string]any{
				"apm":  point.APM,
				"eapm": point.EAPM,
			},
		})
	}
	for _, stat := range hotkeys {
		if stat.Total == 0 {
			continue
		}
		playerID := fmt.Sprint(stat.PlayerID)
		value := float64(stat.Total)
		facts = append(facts, ReplayFact{
			ID:         hotkeyFactID(stat.PlayerID, stat.Group),
			TimeMs:     0,
			PlayerID:   &playerID,
			Category:   "control",
			Type:       "hotkey_group",
			Label:      fmt.Sprintf("%s %d번 부대지정 %d회", stat.PlayerName, stat.Group, stat.Total),
			Source:     "derived",
			Visibility: "omniscient",
			Confidence: 0.76,
			Value:      &value,
			Metadata: map[string]any{
				"assigned": stat.Assigned,
				"added":    stat.Added,
				"selected": stat.Selected,
				"share":    stat.SelectShare,
			},
		})
	}
	sort.SliceStable(facts, func(i, j int) bool {
		if facts[i].TimeMs == facts[j].TimeMs {
			return facts[i].ID < facts[j].ID
		}
		return facts[i].TimeMs < facts[j].TimeMs
	})
	return facts
}

func factFromCommand(cmd CommandInfo) ReplayFact {
	playerID := fmt.Sprint(cmd.PlayerID)
	category := coachingCategoryFromCommand(cmd)
	fact := ReplayFact{
		ID:          commandFactID(cmd.Index),
		TimeMs:      secondsToMs(cmd.TimeSeconds),
		PlayerID:    &playerID,
		Category:    category,
		Type:        cmd.Type,
		Label:       commandFactLabel(cmd),
		Source:      commandFactSource(cmd.Category),
		Visibility:  "omniscient",
		Confidence:  0.82,
		RawEventIDs: []string{fmt.Sprintf("cmd-%d", cmd.Index)},
		Metadata: map[string]any{
			"effective": cmd.Effective,
			"category":  cmd.Category,
			"details":   cmd.Details,
		},
	}
	if cmd.Position != nil {
		fact.X = &cmd.Position.X
		fact.Y = &cmd.Position.Y
	}
	if cmd.UnitOrBuilding != nil {
		if cmd.Category == "building" {
			fact.BuildingType = cmd.UnitOrBuilding
		} else {
			fact.UnitType = cmd.UnitOrBuilding
		}
	}
	if !cmd.Effective {
		fact.Confidence = 0.72
	}
	return fact
}

func factFromBuildEvent(event BuildEvent) ReplayFact {
	playerID := fmt.Sprint(event.PlayerID)
	fact := ReplayFact{
		ID:          buildFactID(event.ID),
		TimeMs:      secondsToMs(event.TimeSeconds),
		PlayerID:    &playerID,
		Category:    buildFactCategory(event.Category),
		Type:        event.Category,
		Label:       event.Label,
		Source:      buildFactSource(event.Category),
		Visibility:  "omniscient",
		Confidence:  0.88,
		RawEventIDs: []string{event.ID},
		Metadata: map[string]any{
			"frame": event.Frame,
		},
	}
	if event.Position != nil {
		fact.X = &event.Position.X
		fact.Y = &event.Position.Y
	}
	if event.Category == "building" {
		label := event.Label
		fact.BuildingType = &label
	}
	if event.Category == "unit" {
		label := event.Label
		fact.UnitType = &label
	}
	return fact
}

func detectMeasuredIssues(players []PlayerInfo, commands []CommandInfo, buildOrder []BuildEvent, hotkeys []HotkeyStat, timeline []TimelinePoint, semantic SemanticAnalysisResult, facts []ReplayFact) []DetectedIssue {
	issues := []DetectedIssue{}
	issues = append(issues, detectProductionGapIssues(players, buildOrder)...)
	issues = append(issues, detectLowEffectiveCommandIssues(players, timeline)...)
	issues = append(issues, detectHotkeyIssues(players, hotkeys)...)
	issues = append(issues, detectRegionFocusIssues(players, commands)...)
	issues = append(issues, detectBuildConfidenceIssues(semantic)...)
	issues = sanitizeIssues(issues, factIDSet(facts))
	sort.SliceStable(issues, func(i, j int) bool {
		if severityRank(issues[i].Severity) == severityRank(issues[j].Severity) {
			return issues[i].StartTimeMs < issues[j].StartTimeMs
		}
		return severityRank(issues[i].Severity) > severityRank(issues[j].Severity)
	})
	if len(issues) > 10 {
		issues = issues[:10]
	}
	return issues
}

func detectProductionGapIssues(players []PlayerInfo, buildOrder []BuildEvent) []DetectedIssue {
	issues := []DetectedIssue{}
	for _, player := range players {
		if player.Observer {
			continue
		}
		events := playerBuildEvents(player.ID, buildOrder)
		gaps := productionGaps(events)
		for _, gap := range gaps {
			evidence := buildFactsInRange(events, gap.StartSecond, gap.EndSecond)
			if len(evidence) == 0 {
				continue
			}
			severity := "minor"
			if gap.Duration >= 60 {
				severity = "major"
			}
			value := gap.Duration
			maxValue := 35.0
			endMs := secondsToMs(gap.EndSecond)
			issues = append(issues, DetectedIssue{
				ID:              stableID("issue-production-gap", fmt.Sprint(player.ID), fmt.Sprintf("%.1f", gap.StartSecond), fmt.Sprintf("%.1f", gap.EndSecond)),
				Category:        "production",
				Severity:        severity,
				Title:           fmt.Sprintf("%s 생산·건설 기록이 %.0f초 비었습니다", player.Name, gap.Duration),
				Description:     "명령 기록에서 생산, 건설, 테크 또는 업그레이드가 이어지지 않은 구간입니다.",
				PlayerID:        fmt.Sprint(player.ID),
				StartTimeMs:     secondsToMs(gap.StartSecond),
				EndTimeMs:       &endMs,
				EvidenceIDs:     evidence,
				Confidence:      0.74,
				MeasurableValue: &value,
				ExpectedRange:   &ExpectedRange{Max: &maxValue, Unit: "seconds_between_production_events"},
			})
		}
	}
	return issues
}

func detectLowEffectiveCommandIssues(players []PlayerInfo, timeline []TimelinePoint) []DetectedIssue {
	issues := []DetectedIssue{}
	for _, player := range players {
		if player.Observer {
			continue
		}
		for _, segment := range playerTimeline(player.ID, timeline) {
			if segment.APM < 80 || segment.EAPM <= 0 {
				continue
			}
			rate := round1(segment.EAPM * 100 / segment.APM)
			if rate >= 62 {
				continue
			}
			startMs := int64(segment.StartSeconds) * 1000
			endMs := int64(segment.EndSeconds) * 1000
			evidence := []string{timelineFactID(player.ID, segment.StartSeconds, segment.EndSeconds)}
			maxValue := 62.0
			issues = append(issues, DetectedIssue{
				ID:              stableID("issue-command-efficiency", fmt.Sprint(player.ID), fmt.Sprint(segment.StartSeconds), fmt.Sprint(segment.EndSeconds)),
				Category:        "control",
				Severity:        "minor",
				Title:           fmt.Sprintf("%s %s-%s 도움 된 명령 비율이 낮았습니다", player.Name, formatSeconds(segment.StartSeconds), formatSeconds(segment.EndSeconds)),
				Description:     "마우스 클릭 수는 많았지만 생산·이동·공격처럼 경기 상태를 바꾼 명령 비중이 낮은 구간입니다.",
				PlayerID:        fmt.Sprint(player.ID),
				StartTimeMs:     startMs,
				EndTimeMs:       &endMs,
				EvidenceIDs:     evidence,
				Confidence:      0.68,
				MeasurableValue: &rate,
				ExpectedRange:   &ExpectedRange{Min: &maxValue, Unit: "effective_command_rate_percent"},
			})
		}
	}
	return issues
}

func detectHotkeyIssues(players []PlayerInfo, hotkeys []HotkeyStat) []DetectedIssue {
	issues := []DetectedIssue{}
	for _, player := range players {
		if player.Observer {
			continue
		}
		groups := usedHotkeyGroups(player.ID, hotkeys)
		dominant, share := dominantHotkey(player.ID, hotkeys)
		if len(groups) > 2 && share < 60 {
			continue
		}
		if hotkeyTotal(player.ID, hotkeys) == 0 {
			continue
		}
		value := share
		maxValue := 60.0
		evidence := []string{}
		if dominant != nil {
			evidence = append(evidence, hotkeyFactID(player.ID, *dominant))
		} else {
			evidence = append(evidence, hotkeyFactID(player.ID, -1))
		}
		issues = append(issues, DetectedIssue{
			ID:              stableID("issue-hotkey-focus", fmt.Sprint(player.ID), fmt.Sprintf("%.1f", share)),
			Category:        "control",
			Severity:        "minor",
			Title:           fmt.Sprintf("%s 부대지정이 한쪽에 몰렸습니다", player.Name),
			Description:     "주병력, 생산 확인, 견제 병력이 같은 번호에 섞이면 교전 중 다시 찾는 시간이 생깁니다.",
			PlayerID:        fmt.Sprint(player.ID),
			StartTimeMs:     0,
			EvidenceIDs:     evidence,
			Confidence:      0.7,
			MeasurableValue: &value,
			ExpectedRange:   &ExpectedRange{Max: &maxValue, Unit: "dominant_hotkey_share_percent"},
		})
	}
	return issues
}

func detectRegionFocusIssues(players []PlayerInfo, commands []CommandInfo) []DetectedIssue {
	issues := []DetectedIssue{}
	for _, player := range players {
		if player.Observer {
			continue
		}
		positioned := playerPositionedCommands(player.ID, commands)
		if len(positioned) < 80 {
			continue
		}
		nearby := 0
		for index := 1; index < len(positioned); index++ {
			if positioned[index].Position != nil && positioned[index-1].Position != nil && distance(*positioned[index].Position, *positioned[index-1].Position) < 16 {
				nearby++
			}
		}
		share := round1(float64(nearby) * 100 / float64(len(positioned)-1))
		if share < 72 {
			continue
		}
		value := share
		maxValue := 72.0
		first := positioned[0]
		last := positioned[len(positioned)-1]
		endMs := secondsToMs(last.TimeSeconds)
		issues = append(issues, DetectedIssue{
			ID:              stableID("issue-region-focus", fmt.Sprint(player.ID), fmt.Sprintf("%.1f", share)),
			Category:        "scouting",
			Severity:        "info",
			Title:           fmt.Sprintf("%s 화면 이동이 비슷한 지역에 반복됐습니다", player.Name),
			Description:     "좌표가 있는 명령이 좁은 지역에 많이 몰려 있어 다른 지역 확인이 부족했을 가능성이 있습니다.",
			PlayerID:        fmt.Sprint(player.ID),
			StartTimeMs:     secondsToMs(first.TimeSeconds),
			EndTimeMs:       &endMs,
			EvidenceIDs:     []string{commandFactID(first.Index), commandFactID(last.Index)},
			Confidence:      0.46,
			MeasurableValue: &value,
			ExpectedRange:   &ExpectedRange{Max: &maxValue, Unit: "nearby_positioned_command_share_percent"},
		})
	}
	return issues
}

func detectBuildConfidenceIssues(semantic SemanticAnalysisResult) []DetectedIssue {
	issues := []DetectedIssue{}
	for _, classification := range semantic.BuildClassifications {
		if classification.Confidence >= 0.68 {
			continue
		}
		value := classification.Confidence
		minValue := 0.68
		evidence := []string{}
		for _, id := range classification.Evidence.CommandIDs {
			evidence = append(evidence, buildFactID(id))
		}
		if len(evidence) == 0 {
			continue
		}
		issues = append(issues, DetectedIssue{
			ID:              stableID("issue-build-unclear", fmt.Sprint(classification.PlayerID), classification.BuildCode),
			Category:        "build",
			Severity:        "minor",
			Title:           fmt.Sprintf("%s 초반 빌드 흐름이 선명하지 않습니다", classification.PlayerName),
			Description:     "초반 생산, 테크, 확장 순서가 하나의 뚜렷한 의도로 이어졌는지 리플레이로 확인할 필요가 있습니다.",
			PlayerID:        fmt.Sprint(classification.PlayerID),
			StartTimeMs:     secondsToMs(classification.StartSecond()),
			EvidenceIDs:     evidence,
			Confidence:      0.62,
			MeasurableValue: &value,
			ExpectedRange:   &ExpectedRange{Min: &minValue, Unit: "opening_classifier_confidence"},
		})
	}
	return issues
}

func buildCoachFindings(issues []DetectedIssue, knowledge []KnowledgeMatch, validFacts map[string]bool) []CoachFinding {
	findings := []CoachFinding{}
	knowledgeIDs := []string{}
	for _, item := range knowledge {
		knowledgeIDs = append(knowledgeIDs, item.KnowledgeID)
	}
	for _, issue := range issues {
		if issue.Severity == "info" {
			continue
		}
		evidence := filterValidIDs(issue.EvidenceIDs, validFacts)
		if len(evidence) == 0 {
			continue
		}
		findings = append(findings, CoachFinding{
			ID:           stableID("finding", issue.ID),
			Severity:     findingSeverity(issue.Severity),
			Category:     issue.Category,
			Title:        findingTitle(issue),
			Summary:      findingSummary(issue),
			WhyItMatters: findingWhy(issue),
			NextAction:   findingNextAction(issue),
			StartTimeMs:  issue.StartTimeMs,
			EndTimeMs:    issue.EndTimeMs,
			EvidenceIDs:  evidence,
			KnowledgeIDs: knowledgeIDsForIssue(issue, knowledgeIDs),
			Confidence:   clampConfidence(issue.Confidence),
			Limitations:  findingLimitations(issue),
		})
		if len(findings) >= 4 {
			break
		}
	}
	return findings
}

func (classification BuildClassification) StartSecond() float64 {
	if len(classification.Evidence.Seconds) == 0 {
		return 0
	}
	return classification.Evidence.Seconds[0]
}

func (repo seedKnowledgeRepository) Search(matchup string, phase string, mapName string, categories []string) []KnowledgeMatch {
	categorySet := map[string]bool{}
	for _, category := range categories {
		categorySet[category] = true
	}
	matches := []KnowledgeMatch{}
	for _, item := range repo.items {
		if item.Status != "approved" && item.Status != "reviewed" {
			continue
		}
		score := 0.0
		reasons := []string{}
		if item.Matchup == "" || item.Matchup == matchup || equivalentMatchup(item.Matchup, matchup) {
			score += 0.35
			reasons = append(reasons, "종족전 일치")
		} else {
			continue
		}
		if item.Phase == "" || item.Phase == phase {
			score += 0.18
			reasons = append(reasons, "경기 단계 일치")
		}
		if len(item.Maps) == 0 || containsFold(item.Maps, mapName) {
			score += 0.12
			reasons = append(reasons, "맵 조건 통과")
		}
		if overlaps(item.Categories, categorySet) {
			score += 0.25
			reasons = append(reasons, "문제 카테고리 일치")
		}
		if score >= 0.45 {
			matches = append(matches, KnowledgeMatch{
				KnowledgeID: item.ID,
				Title:       item.Title,
				Score:       round2(score),
				Reason:      strings.Join(reasons, " · "),
			})
		}
	}
	sort.SliceStable(matches, func(i, j int) bool {
		return matches[i].Score > matches[j].Score
	})
	if len(matches) > 5 {
		matches = matches[:5]
	}
	return matches
}

func seedCoachingKnowledge() []CoachingKnowledge {
	now := "2026-08-03T00:00:00Z"
	return []CoachingKnowledge{
		{
			ID:          "knowledge-pvt-production-cadence",
			Title:       "PvT 초중반 생산 공백 대응",
			Content:     "PvT 초중반에는 전투 화면을 보는 동안에도 게이트웨이, 로보틱스, 업그레이드 입력이 끊기지 않아야 한다. 35초 이상 생산·테크 입력이 비면 다음 교전 병력 수가 줄어든다.",
			SourceType:  "manual",
			SourceTitle: "HM seed coaching rules",
			Matchup:     "PvT",
			Phase:       "early",
			Categories:  []string{"production", "build"},
			Status:      "approved",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "knowledge-control-effective-commands",
			Title:       "클릭 수보다 경기 도움 명령을 남긴다",
			Content:     "APM이 높아도 같은 유닛 재선택, 목적 없는 우클릭, 화면만 움직이는 입력이 많으면 실제 경기 상태는 바뀌지 않는다. 생산, 공격, 후퇴, 정찰 중 하나로 설명되는 명령을 남기는 것이 중요하다.",
			SourceType:  "manual",
			SourceTitle: "HM seed coaching rules",
			Phase:       "early",
			Categories:  []string{"control", "scouting"},
			Status:      "approved",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "knowledge-hotkey-role-split",
			Title:       "부대지정은 역할별로 나눈다",
			Content:     "주병력, 견제 병력, 생산 확인이 한 번호에 섞이면 전투 중 다시 찾는 시간이 생긴다. 번호마다 역할을 정하면 화면 전환과 생산 루틴이 안정된다.",
			SourceType:  "manual",
			SourceTitle: "HM seed coaching rules",
			Phase:       "early",
			Categories:  []string{"control"},
			Status:      "approved",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
	}
}

func buildCoachingScope(players []PlayerInfo, replay ReplayInfo, facts []ReplayFact) CoachingScope {
	matchup := matchupLabel(players)
	mapName := derefString(replay.Map.Name, "Unknown map")
	phase := "early"
	limitations := []string{
		"현재 분석은 명령·생산·건설·좌표 기록 기반입니다.",
		"정확한 시야, 자원, 서플라이, 유닛 생존 상태는 게임 엔진 재구성이 필요합니다.",
		"상대가 그 순간 실제로 봤는지는 단정하지 않고 omniscient 또는 inferred로 표시합니다.",
	}
	confidence := 0.64
	if len(facts) > 200 {
		confidence = 0.72
	}
	return CoachingScope{
		Headline:       fmt.Sprintf("%s 초중반 근거 기반 분석", matchup),
		Matchup:        matchup,
		MapName:        mapName,
		Phase:          phase,
		DataTypes:      []string{"명령 로그", "생산·건설 기록", "단축키 기록", "좌표가 있는 명령"},
		Confidence:     confidence,
		Limitations:    limitations,
		KnowledgeState: knowledgeState(matchup, mapName),
	}
}

func knowledgeState(matchup string, mapName string) []string {
	state := []string{}
	if strings.Contains(matchup, "?") || matchup == "UNKNOWN" {
		state = append(state, "종족전 지식 부족")
	} else {
		state = append(state, fmt.Sprintf("%s: 기본 분석", matchup))
	}
	if mapName == "Unknown map" {
		state = append(state, "맵 이름 확인 필요")
	} else {
		state = append(state, fmt.Sprintf("%s 맵 지식 보강 가능", mapName))
	}
	state = append(state, "중후반 전투 결과: 데이터 축적 중")
	return state
}

func commandFactLabel(cmd CommandInfo) string {
	if cmd.UnitOrBuilding != nil && *cmd.UnitOrBuilding != "" {
		return fmt.Sprintf("%s · %s", cmd.Category, *cmd.UnitOrBuilding)
	}
	if cmd.Details != "" {
		return fmt.Sprintf("%s · %s", cmd.Category, cmd.Details)
	}
	return cmd.Category
}

func commandFactSource(category string) string {
	switch category {
	case "selection":
		return "selection"
	case "building":
		return "build_event"
	case "unit":
		return "train_event"
	case "tech":
		return "upgrade_event"
	case "movement", "other", "cancel", "hotkey":
		return "command"
	default:
		return "command"
	}
}

func buildFactSource(category string) string {
	switch category {
	case "building":
		return "build_event"
	case "unit":
		return "train_event"
	case "tech", "upgrade":
		return "upgrade_event"
	default:
		return "derived"
	}
}

func buildFactCategory(category string) string {
	switch category {
	case "building", "tech", "upgrade":
		return "build"
	case "unit":
		return "production"
	default:
		return "strategy"
	}
}

func coachingCategoryFromCommand(cmd CommandInfo) string {
	switch cmd.Category {
	case "building", "unit", "tech", "upgrade":
		return "production"
	case "movement":
		return "map_position"
	case "selection", "hotkey":
		return "control"
	case "cancel":
		return "economy"
	default:
		if cmd.Position != nil {
			return "map_position"
		}
		return "control"
	}
}

func commandFactID(index int) string {
	return fmt.Sprintf("fact-command-%d", index)
}

func buildFactID(id string) string {
	return fmt.Sprintf("fact-%s", id)
}

func timelineFactID(playerID int, start int, end int) string {
	return stableID("fact-timeline", fmt.Sprint(playerID), fmt.Sprint(start), fmt.Sprint(end))
}

func hotkeyFactID(playerID int, group int) string {
	return stableID("fact-hotkey", fmt.Sprint(playerID), fmt.Sprint(group))
}

func secondsToMs(seconds float64) int64 {
	return int64(math.Round(seconds * 1000))
}

func buildFactsInRange(events []BuildEvent, start float64, end float64) []string {
	ids := []string{}
	for _, event := range events {
		if event.TimeSeconds >= start && event.TimeSeconds <= end {
			ids = append(ids, buildFactID(event.ID))
		}
	}
	if len(ids) > 6 {
		ids = ids[:6]
	}
	return ids
}

func factIDSet(facts []ReplayFact) map[string]bool {
	set := map[string]bool{}
	for _, fact := range facts {
		set[fact.ID] = true
	}
	return set
}

func sanitizeIssues(issues []DetectedIssue, validFacts map[string]bool) []DetectedIssue {
	sanitized := []DetectedIssue{}
	for _, issue := range issues {
		issue.EvidenceIDs = filterValidIDs(issue.EvidenceIDs, validFacts)
		if len(issue.EvidenceIDs) == 0 {
			continue
		}
		sanitized = append(sanitized, issue)
	}
	return sanitized
}

func filterValidIDs(ids []string, valid map[string]bool) []string {
	result := []string{}
	seen := map[string]bool{}
	for _, id := range ids {
		if valid[id] && !seen[id] {
			result = append(result, id)
			seen[id] = true
		}
	}
	return result
}

func severityRank(severity string) int {
	switch severity {
	case "critical":
		return 4
	case "major":
		return 3
	case "minor":
		return 2
	default:
		return 1
	}
}

func findingSeverity(severity string) string {
	if severity == "critical" || severity == "major" || severity == "minor" {
		return severity
	}
	return "minor"
}

func findingTitle(issue DetectedIssue) string {
	switch issue.Category {
	case "production":
		return strings.Replace(issue.Title, "기록이", "흐름이", 1)
	case "control":
		return issue.Title
	case "build":
		return issue.Title
	default:
		return issue.Title
	}
}

func findingSummary(issue DetectedIssue) string {
	time := formatMs(issue.StartTimeMs)
	if issue.EndTimeMs != nil {
		time = fmt.Sprintf("%s-%s", time, formatMs(*issue.EndTimeMs))
	}
	switch issue.Category {
	case "production":
		return fmt.Sprintf("%s 구간에 생산이나 건설로 이어지는 기록이 비었습니다. 화면을 보고 있었더라도 후속 병력 충원이 늦어졌을 수 있습니다.", time)
	case "control":
		if issue.MeasurableValue != nil && strings.Contains(issue.Title, "도움 된 명령") {
			return fmt.Sprintf("%s 구간에 입력은 많았지만 실제 경기 상태를 바꾼 명령 비율이 %.1f%%였습니다.", time, *issue.MeasurableValue)
		}
		return fmt.Sprintf("%s 기준으로 조작 습관이 한쪽에 몰린 흐름이 확인됩니다.", time)
	case "build":
		return fmt.Sprintf("%s 이후 초반 빌드가 하나의 선명한 흐름으로 이어졌는지 확인이 필요합니다.", time)
	default:
		return issue.Description
	}
}

func findingWhy(issue DetectedIssue) string {
	switch issue.Category {
	case "production":
		return "스타크래프트에서는 생산이 한 번 쉬면 다음 교전 병력 수, 업그레이드 시작, 멀티 활성화 시간이 같이 밀립니다. 이 손해는 바로 보이지 않아도 몇십 초 뒤 병력 차이로 나타납니다."
	case "control":
		if strings.Contains(issue.Title, "부대지정") {
			return "부대지정이 한 번호에 몰리면 병력을 찾고 생산을 확인하는 시간이 길어집니다. 손이 느린 문제가 아니라, 필요한 명령을 꺼내는 경로가 복잡해지는 문제입니다."
		}
		return "마우스 클릭 수가 많아도 생산, 공격, 후퇴, 정찰처럼 결과를 바꾸는 명령이 적으면 경기 흐름은 좋아지지 않습니다."
	case "build":
		return "빌드 의도가 흐리면 상대가 무엇을 하는지 보기 전에 내 다음 행동도 흔들립니다. 첫 생산, 첫 테크, 첫 확장, 첫 진출 시간이 기준점이 되어야 합니다."
	default:
		return "명령 기록에서 확인된 흐름이 실제 경기 판단으로 이어지는지 다시 볼 필요가 있습니다."
	}
}

func findingNextAction(issue DetectedIssue) string {
	switch issue.Category {
	case "production":
		return "다음 판에는 교전이나 정찰 화면을 보기 직전에 생산 건물 단축키를 먼저 누르고, 유닛이나 업그레이드 예약을 한 번 넣은 뒤 화면을 옮기세요."
	case "control":
		if strings.Contains(issue.Title, "부대지정") {
			return "다음 판에는 1번 주병력, 2번 견제/보조 병력, 3번 생산 확인처럼 번호 역할을 정하고 끝까지 유지하세요."
		}
		return "해당 구간을 0.5배속으로 다시 보면서 첫 10초 동안 들어간 클릭을 생산, 공격, 후퇴, 정찰 중 하나로 설명할 수 있는지 확인하세요."
	case "build":
		return "다음 판에는 첫 5분만 따로 복기하면서 첫 생산, 첫 테크, 첫 확장, 첫 진출 시간을 적고 같은 빌드에서 5초 안쪽으로 맞추세요."
	default:
		return "같은 시간대로 돌아가서 화면 위치, 선택한 유닛, 첫 번째 의미 있는 명령을 순서대로 확인하세요."
	}
}

func findingLimitations(issue DetectedIssue) []string {
	if issue.Confidence < 0.6 {
		return []string{"시야와 실제 유닛 생존 상태는 복원하지 못해 가능성 표현으로 표시합니다."}
	}
	return nil
}

func knowledgeIDsForIssue(issue DetectedIssue, ids []string) []string {
	if len(ids) == 0 {
		return []string{}
	}
	if issue.Category == "production" || issue.Category == "build" || issue.Category == "control" {
		if len(ids) > 2 {
			return ids[:2]
		}
		return ids
	}
	return []string{ids[0]}
}

func issueCategories(issues []DetectedIssue) []string {
	result := []string{}
	seen := map[string]bool{}
	for _, issue := range issues {
		if !seen[issue.Category] {
			result = append(result, issue.Category)
			seen[issue.Category] = true
		}
	}
	return result
}

func playerPositionedCommands(playerID int, commands []CommandInfo) []CommandInfo {
	result := []CommandInfo{}
	for _, command := range commands {
		if command.PlayerID == playerID && command.Position != nil {
			result = append(result, command)
		}
	}
	return result
}

func formatMs(ms int64) string {
	return formatSeconds(int(ms / 1000))
}

func formatSeconds(seconds int) string {
	if seconds < 0 {
		seconds = 0
	}
	return fmt.Sprintf("%02d:%02d", seconds/60, seconds%60)
}

func derefString(value *string, fallback string) string {
	if value == nil || *value == "" {
		return fallback
	}
	return *value
}

func equivalentMatchup(a string, b string) bool {
	if a == b {
		return true
	}
	return sortedMatchup(a) == sortedMatchup(b)
}

func sortedMatchup(matchup string) string {
	parts := strings.Split(matchup, "v")
	sort.Strings(parts)
	return strings.Join(parts, "v")
}

func containsFold(values []string, needle string) bool {
	if needle == "" || needle == "Unknown map" {
		return false
	}
	for _, value := range values {
		if strings.EqualFold(value, needle) {
			return true
		}
	}
	return false
}

func overlaps(values []string, set map[string]bool) bool {
	if len(values) == 0 || len(set) == 0 {
		return false
	}
	for _, value := range values {
		if set[value] {
			return true
		}
	}
	return false
}
