---
name: pdf-processor
description: Process and extract content from PDF documents. Use when analyzing PRDs, specifications, documentation, contracts, or any PDF-based content. Handles text extraction, summarization, and structured data extraction.
---

# PDF Processor

Extract and analyze content from PDF documents. Use this skill for PRDs, specifications, documentation, reports, or any PDF-based content.

## When to Use

- User provides a PDF file path
- Analyzing PRDs or specification documents
- Extracting requirements from documentation
- Summarizing reports or contracts
- Converting PDF content to structured data

## Capabilities

### Text Extraction
- Read PDF files using the Read tool (supports PDF format)
- Extract text content from all pages
- Preserve document structure where possible

### Content Analysis
- Summarize long documents
- Extract key points and requirements
- Identify action items or deliverables
- Parse tables and structured data

### PRD Processing
When processing a PRD, extract:
1. **Project Overview** - What is being built
2. **Functional Requirements** - What it must do
3. **Non-Functional Requirements** - Performance, security, scale
4. **User Stories** - Who uses it and how
5. **Technical Constraints** - Integrations, platforms, limitations
6. **Success Metrics** - How success is measured
7. **Timeline/Milestones** - If specified

## Workflow

### 1. Read the PDF

```
Use the Read tool with the PDF file path:
Read: /path/to/document.pdf
```

The Read tool automatically processes PDFs page-by-page, extracting text and visual content.

### 2. Analyze Content

Based on document type:

**For PRDs/Specs:**
```markdown
## PRD Analysis

### Overview
[Brief description of what's being built]

### Requirements
| ID | Requirement | Priority | Type |
|----|-------------|----------|------|
| R1 | [requirement] | High/Med/Low | Functional/Non-functional |

### User Stories
- As a [user], I want [feature] so that [benefit]

### Technical Constraints
- [constraint 1]
- [constraint 2]

### Open Questions
- [ambiguity or missing info]
```

**For Reports/Documentation:**
```markdown
## Document Summary

### Key Points
1. [point 1]
2. [point 2]

### Detailed Findings
[structured breakdown]

### Action Items
- [ ] [action 1]
- [ ] [action 2]
```

### 3. Handoff

After extracting content:
- **PRD documents** → Delegate to orchestrator agent for project setup
- **Technical specs** → Delegate to relevant architect agent
- **Requirements docs** → Create tasks in TASKS.md via project-manager

## Output Formats

### Structured Requirements

```json
{
  "requirements": [
    {
      "id": "REQ-001",
      "description": "Users can log in with email/password",
      "type": "functional",
      "priority": "high",
      "acceptance_criteria": [
        "Email format validated",
        "Password minimum 8 characters"
      ]
    }
  ]
}
```

### Summary Format

```markdown
## Executive Summary
[2-3 sentence overview]

## Key Takeaways
1. [takeaway]
2. [takeaway]

## Detailed Breakdown
[section by section analysis]
```

## Tips for Better Extraction

### Handling Complex PDFs
- If text extraction is garbled, the PDF may be image-based
- For scanned documents, note that OCR quality varies
- Tables may need manual restructuring

### Large Documents
- For documents > 50 pages, summarize by section first
- Focus on executive summaries and conclusions
- Extract table of contents for navigation

### Multi-language Documents
- Identify primary language first
- Note sections in different languages
- Translate key sections if needed

## Integration with Workflow

After processing a PDF:

| Document Type | Next Step |
|---------------|-----------|
| PRD | → orchestrator agent |
| API Spec | → backend-architect agent |
| UI Mockups (in PDF) | → /style-extractor skill |
| Technical Docs | → Relevant architect agent |
| Requirements | → project-manager agent |

## Guardrails

### Do
- Preserve original meaning when summarizing
- Flag ambiguities or missing information
- Structure output for easy consumption
- Note page numbers for key sections

### Don't
- Don't make assumptions about unstated requirements
- Don't skip sections without noting them
- Don't lose important details in summarization
- Don't output raw unstructured text dumps
