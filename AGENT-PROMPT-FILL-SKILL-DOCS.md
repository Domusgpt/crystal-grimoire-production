# Agent Prompt: Fill Missing Skill Documentation

Use this prompt with the Task tool to have an agent populate missing documentation for skills.

---

## Task for Agent

You are tasked with filling in missing documentation for Claude skills that have empty `docs/` folders.

### Your Objectives:

1. **Invoke the skill-creator skill** to understand proper skill documentation structure
2. **Research official documentation** for each technology area
3. **Create comprehensive docs/** files for skills missing documentation

### Skills That Need Documentation:

**Priority 1 - Core Firebase Skills:**
- **firebase-core** (`/home/millz/.claude/skills/firebase-core/`)
  - Empty docs/ folder
  - Should contain: FIREBASE_CLI.md, GCLOUD_SDK.md, PROJECT_MANAGEMENT.md, ENVIRONMENT_VARIABLES.md, DEPLOYMENT_WORKFLOWS.md, TROUBLESHOOTING.md
  - Research from: https://firebase.google.com/docs/cli, gcloud SDK docs

**Priority 2 - Parserator Marketing:**
- **parserator-marketing** (`/home/millz/.claude/skills/parserator-marketing/`)
  - Empty docs/ folder
  - Skill is about marketing strategy for Parserator API (AI-powered data parsing)
  - Should contain: POSITIONING.md, GO_TO_MARKET.md, CONTENT_STRATEGY.md, LAUNCH_OPERATIONS.md
  - This is product marketing, not technical docs

**Priority 3 - Parserator Testing:**
- **parserator-testing-qa** (`/home/millz/.claude/skills/parserator-testing-qa/`)
  - Empty docs/ folder
  - Skill is about testing Parserator API deployments
  - Should contain: TEST_SUITES.md, API_VALIDATION.md, PERFORMANCE_MONITORING.md, DEBUGGING.md

### Guidelines:

**CRITICAL: Keep It General**
- Do NOT include project-specific details (no specific project names, URLs, file paths)
- Documentation should apply to ANY project using these technologies
- Use placeholder examples like `your-project-id`, `your-api-endpoint`, etc.

**Documentation Structure (from skill-creator):**
- Each doc file should be comprehensive (200-500 lines)
- Include code examples, commands, and best practices
- Organize with clear sections and headers
- Add troubleshooting sections with common errors

**Firebase-Core Specifics:**
- Focus on Firebase CLI commands (v14.x+)
- gcloud SDK integration
- Environment variables and secrets management (v2 functions)
- Multi-project management
- Deployment workflows and troubleshooting
- Common timeout issues and solutions

**Parserator-Marketing Specifics:**
- This is about marketing an AI API product
- Positioning strategy for developer audiences
- Content strategy and evangelism
- Launch operations and growth tactics
- NOT technical implementation

**Parserator-Testing-QA Specifics:**
- API health validation
- Test scenario design
- Performance benchmarking
- Parsing accuracy verification
- Deployment validation workflows

### Process:

1. **Read the skill-creator skill first** to understand documentation best practices
2. **For each skill:**
   - Read the SKILL.md to understand what it does
   - Research official documentation for the technology area
   - Create comprehensive markdown files in docs/ folder
   - Use clear examples and code snippets
   - Keep everything GENERAL (no project-specific details)
3. **Report back** with a summary of what you created

### Expected Deliverables:

For each skill, create 4-6 comprehensive documentation files in the `docs/` folder, following Anthropic's skill documentation best practices.

---

**Created:** November 24, 2025
**Purpose:** Populate empty docs folders in Claude skills with comprehensive, general-purpose documentation
