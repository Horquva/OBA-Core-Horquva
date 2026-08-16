# PART-3: SEARCH & DISCOVERY MODEL

**Purpose:** Specify search algorithms, discovery patterns, and information retrieval logic.

---

## SEARCH ARCHITECTURE

### Search Flow

```
User Query Input
      ↓
Input Validation & Sanitization
      ↓
Query Normalization (lowercase, trim, tokenize)
      ↓
Synonym Expansion (optional)
      ↓
Query Index Lookup
      ↓
Relevance Ranking
      ↓
Status Filtering (exclude deprecated by default)
      ↓
Result Pagination
      ↓
Result Display with Highlighting
```

---

## QUERY PROCESSING

### 1. Normalization

**Steps:**
1. Trim whitespace
2. Convert to lowercase
3. Remove special characters (except quoted phrases)
4. Tokenize by spaces

**Examples:**
```
Input:  "  Find Best PRACTICES for Performance  "
Output: ["find", "best", "practices", "for", "performance"]

Input:  '"REST API" design'
Output: ["rest api", "design"]
```

### 2. Query Types

#### Simple Query
```
Single term or multiple terms: "performance testing"
```

#### Phrase Query
```
Exact phrase: "REST API"
Behavior: Match whole phrase, not individual words
```

#### Category Query
```
Within category: category:standards "performance"
```

#### Field Query
```
Within field: owner:"John Smith"
title:"Security Practices"
```

### 3. Query Expansion

**Synonym Mapping (Examples):**
```
"API" → "API", "interface", "endpoint"
"DB" → "database", "data store"
"app" → "application"
"perf" → "performance"
"auth" → "authentication", "authorization"
"deploy" → "deployment", "release"
```

**Keyword Expansion:**
```
"testing" → "testing", "tests", "test", "QA"
"security" → "security", "secure", "encryption"
```

---

## INDEXING STRATEGY

### Indexed Fields

| Field | Weight | Searchable | Facetable |
|-------|--------|-----------|-----------|
| title | 100 | ✓ | - |
| summary | 80 | ✓ | - |
| category | 90 | ✓ | ✓ |
| content | 60 | ✓ | - |
| keywords | 75 | ✓ | - |
| owner | 50 | ✓ | ✓ |
| status | 40 | ✓ | ✓ |
| createdDate | 30 | - | ✓ |
| lastUpdatedDate | 35 | - | ✓ |
| views | 20 | - | - |

### Index Updates

**Real-time:** On asset creation/update
**Batch:** Daily re-index (optional, for optimization)
**Frequency:** Immediately when content changes

---

## RELEVANCE RANKING

### Ranking Algorithm

```
Score = (Match_Score × Field_Weight) + Popularity_Boost + Recency_Boost
```

### Field Matching Scores

**Exact Match:** 100%
```
Query:  "REST API"
Match:  title="REST API Best Practices"
Score:  100
```

**Prefix Match:** 80%
```
Query:  "perform"
Match:  title="Performance Optimization"
Score:  80
```

**Partial Match:** 60%
```
Query:  "api"
Match:  content="...describes the API interface..."
Score:  60
```

**No Match:** 0%

### Field Weights (Cumulative Scoring)

```
Title Match:      100 × Field_Weight(100) × Field_Multiplier(1.0) = 100
Summary Match:     80 × Field_Weight(80)  × Field_Multiplier(0.8) =  64
Category Match:    90 × Field_Weight(90)  × Field_Multiplier(0.9) =  81
Content Match:     60 × Field_Weight(60)  × Field_Multiplier(0.6) =  36
```

### Popularity & Recency Boosts

**Popularity Boost (View Count):**
```
Boost = log10(views + 1) × 0.5
- 0 views = 0 boost
- 10 views = 0.5 boost
- 100 views = 1.0 boost
- 1000+ views = 1.5 boost
```

**Recency Boost (Last Updated):**
```
Days_Old = today - lastUpdatedDate
Boost = max(0, 2 - (Days_Old / 365))
- Updated today = 2.0 boost
- Updated 6 months ago = 1.0 boost
- Updated 2+ years ago = 0 boost
```

**Status Boost:**
```
Approved:    +10 points
Draft:       -5 points
Deprecated:  -20 points (if included)
```

### Example: Ranking Calculation

**Query:** "authentication best practice"

**Result 1:** "Authentication Best Practices" (Approved, 30 views, updated 1 month ago)
```
Title match (100%):         100 × 1.0 = 100
Category match (90%):        81
Summary match (80%):         64
Popularity boost:            0.8
Recency boost:               1.8
Status boost:                10
Total Score:                 257.6
Rank:                        #1
```

**Result 2:** "Building Secure APIs" (Approved, 10 views, updated 2 years ago)
```
Title match (50%):           50 × 1.0 = 50
Category match (60%):        54
Content match (60%):         36
Popularity boost:            0.5
Recency boost:               0
Status boost:                10
Total Score:                 150.5
Rank:                        #2
```

---

## FACETED NAVIGATION

### Facet Types

**Category Facet**
```
Standards (45)
Best Practices (38)
Playbooks (22)
Runbooks (31)
Lessons Learned (15)
ADRs (28)
Glossary (142)
Documentation (56)
```

**Status Facet**
```
Approved (245) ✓ default
Draft (32)
Deprecated (8)
```

**Owner Facet**
```
Platform Team (89)
Security Team (56)
Operations (43)
Architecture (34)
...
```

**Date Facet**
```
Last 7 days (15)
Last 30 days (42)
Last 90 days (98)
Last 1 year (156)
Older (112)
```

### Facet Behavior

**Multi-select:** Combine multiple categories
```
Standards AND Best Practices
```

**Single-select:** Only one status at a time
```
Status: Approved OR Draft (not both)
```

**Range-select:** Date range
```
Updated: 2025-01-01 to 2025-12-31
```

### Facet Counts

**Dynamic Counts:** Update based on current search + filters
```
Search: "performance"
  Standards (12) - includes "performance standard"
  Best Practices (8) - includes "performance optimization"
  Playbooks (5) - includes "performance tuning procedure"
```

---

## AUTOCOMPLETE & SUGGESTIONS

### Suggestion Types

**Recent Searches** (User's history)
```
Recent:
• "API design patterns"
• "security vulnerabilities"
• "deployment procedures"
```

**Popular Searches** (Most searched across users)
```
Popular:
• "authentication"
• "performance optimization"
• "REST API"
```

**Asset Titles** (Direct matches)
```
Assets:
• "REST API Best Practices"
• "REST API Security"
• "REST API Design Patterns"
```

**Keyword Completions** (Finish current word)
```
Typing: "perf"
Suggestions:
• "performance"
• "performance optimization"
• "performance testing"
```

### Suggestion Ranking

1. **Exact prefix match** (highest priority)
2. **Popular searches** (frequency-based)
3. **Recent user searches**
4. **Asset titles** (relevance-based)
5. **Keyword suggestions** (lowest priority)

### Autocomplete Implementation

**Debounce:** 300ms (wait before fetching)
**Min characters:** 2 (start suggestions at 3 characters)
**Max suggestions:** 8 (show top 8 only)
**Fetch timeout:** 1000ms (user won't wait longer)

---

## SEARCH RESULT DISPLAY

### Result Layout

```
┌─────────────────────────────────────────┐
│ Result Summary: "123 results for 'api'" │
└─────────────────────────────────────────┘

[Result Card 1]
  Title: "REST API Best Practices"
  Category: Best Practices • Status: Approved
  Summary: "This guide covers designing robust REST...
  <snippet with search terms highlighted>
  Relevance: ████████░░ 85%

[Result Card 2]
  Title: "Building Secure APIs"
  Category: Documentation • Status: Approved
  Summary: "Security considerations when building...
  <snippet with search terms highlighted>
  Relevance: ███████░░░ 72%

[Pagination: 1 2 3 ... 23 Next]
```

### Search Term Highlighting

**In Titles:** Bold
```
"REST API" Best Practices → REST API Best Practices
```

**In Summaries:** Highlighted background
```
"This guide covers designing robust REST APIs..."
                                       ~~~~
```

**Context Snippet:** Show surrounding context
```
"...designing robust REST APIs requires careful
attention to versioning and error handling..."
         ~~~~
```

### Result Snippets

**Auto-generated:** Extract 150-200 chars with term context
**Highlights:** Bold search terms in snippet
**Truncation:** "..." at start/end if truncated

---

## EMPTY STATE HANDLING

### No Results Scenarios

**Scenario 1: Empty Query**
```
Message: "Enter a search term to get started"
Action: Browse by category (link)
```

**Scenario 2: No Exact Matches**
```
Message: "No results for 'xyzabc'"
Suggestions:
  • "Did you mean: xyz abc"
  • Browse "Documentation" category
  • View all assets
```

**Scenario 3: Filters Too Restrictive**
```
Message: "No results matching your filters"
  Search: "api"
  Filters: Standards, Status: Deprecated
Action:
  • Clear filters and try again
  • Try different search term
  • Browse category
```

**Scenario 4: Search Error**
```
Message: "Search unavailable. Please try again."
Action: Retry button
```

### Help Text & Guidance

**Search Tips** (optional help section):
```
Tips:
• Use "quotes" for exact phrases
• Use category:standards to search specific category
• Use AND/OR to combine searches
• Recently updated results shown first
```

---

## FILTER COMBINATIONS

### Valid Filter Combinations

**Category + Status**
```
Category: Standards
Status: Approved
(Find approved standards)
```

**Category + Date + Owner**
```
Category: Playbooks
Updated: Last 30 days
Owner: Platform Team
(Find recent playbooks by team)
```

**Status + Date**
```
Status: Draft
Updated: Last 7 days
(Find recent draft content)
```

### Invalid Combinations (Ignored)

```
Multiple Status values: Approved AND Draft
(Only single status allowed - last one wins)
```

---

## PERFORMANCE CONSIDERATIONS

### Optimization Strategies

**Index Optimization:**
- Pre-computed relevance scores
- Facet caching
- Recently accessed assets cached
- Search result pagination (lazy load)

**Query Optimization:**
- Query plan caching
- Common queries pre-indexed
- Synonym expansion pre-computed
- Spell-check dictionary cached

**Result Optimization:**
- Snippet generation cached
- Highlighting pre-computed
- Pagination lazy-loaded
- Result count approximate for large sets

### Response Time Targets

| Operation | Target | Timeout |
|-----------|--------|---------|
| Simple search | <200ms | 500ms |
| Complex search | <500ms | 1000ms |
| Autocomplete | <100ms | 300ms |
| Facet update | <100ms | 300ms |
| Detail load | <300ms | 1000ms |

---

## SEARCH ANALYTICS

### Metrics to Track

**Query Metrics:**
- Total searches per day
- Average result count
- Average search session length
- Time to first result click

**Result Metrics:**
- Click-through rate (CTR) per result
- Time spent on result
- Result position vs CTR correlation

**Facet Metrics:**
- Most-used facets
- Facet combinations
- Facet abandonment

**User Metrics:**
- Unique searchers
- Search frequency per user
- Avg results clicked per search
- Search refinement rate

### Query Improvements

**No-result queries:** Track and add results or suggestions

**Slow queries:** Analyze and optimize

**Typos:** Autocorrect suggestions for common misspellings

**Trending:** Identify trending topics and promote

---

## SEARCH TESTING STRATEGY

### Test Cases

**Basic Search:**
- [ ] Single term search
- [ ] Multi-term search
- [ ] Phrase search (quoted)
- [ ] Special characters in query

**Autocomplete:**
- [ ] Suggestions appear after 2 chars
- [ ] Keyboard navigation (arrows)
- [ ] Select with Enter
- [ ] Escape closes suggestions

**Filtering:**
- [ ] Single category filter
- [ ] Multiple categories
- [ ] Status filter
- [ ] Date range filter
- [ ] Combine multiple filters

**Empty States:**
- [ ] No results message
- [ ] Typo suggestions
- [ ] Clear filters link
- [ ] Browse categories link

**Performance:**
- [ ] Search < 500ms (target)
- [ ] 1000 results load smoothly
- [ ] Pagination works
- [ ] Infinite scroll performance

**Accessibility:**
- [ ] Search bar keyboard accessible
- [ ] Results keyboard navigable
- [ ] Screen reader announces counts
- [ ] Focus management

---

## ADVANCED SEARCH FEATURES (Future)

### Phase 2 Enhancements

**Saved Searches:**
- Save frequent searches
- Set alerts for new results
- Share searches with team

**Advanced Operators:**
```
author:"John Smith"
created:[2025-01-01 TO 2025-12-31]
views:>100
title:"API"
```

**Personalized Search:**
- Boost results for frequently accessed categories
- Remember user preferences
- Suggest relevant searches based on history

**Search Analytics:**
- Show popular searches
- Trending topics
- Related searches

---

## INTEGRATION WITH KNOWLEDGE PLATFORM

### Data Source

**Source:** PART-2 Knowledge Management Platform
- Standards
- Best Practices
- Playbooks
- Runbooks
- Lessons Learned
- ADRs
- Glossary
- Documentation

**Sync:** Real-time (on update) or daily batch

**Validation:** Only approved/draft content indexed (deprecated with flag)

---

**Status:** READY FOR IMPLEMENTATION  
**Last Updated:** 2026-01-15
