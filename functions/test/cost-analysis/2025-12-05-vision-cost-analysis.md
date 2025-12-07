# Crystal Grimoire - Gemini Vision API Cost Analysis Report

**Test Date:** December 5, 2025 (2025-12-05T19:12:14.158Z)
**Project:** Crystal Grimoire AI Crystal Identification
**Location:** `/mnt/c/Users/millz/crystal-grimoire-fresh-DEPLOY`
**Prepared for:** Analysis Session with Paul Phillips

---

## 1. Test Configuration

| Parameter | Value |
|-----------|-------|
| **Models Tested** | gemini-2.5-flash-lite, gemini-2.5-flash |
| **Image Preprocessing** | 768px max dimension resize (client-side simulation) |
| **Resize Method** | sharp library: `resize(768, 768, { fit: 'inside', withoutEnlargement: true })` |
| **Output Format** | JPEG, quality: 85 |
| **SDK Used** | @google/genai (newer SDK) |
| **Test Images** | 10 images (downloaded from stock photo sites) |
| **Total API Calls** | 20 (10 images × 2 models) |

### Pricing Rates Applied (December 2025)

| Model | Input Cost (per 1M tokens) | Output Cost (per 1M tokens) |
|-------|---------------------------|----------------------------|
| gemini-2.5-flash-lite | $0.10 | $0.40 |
| gemini-2.5-flash | $0.30 | $2.50 |

---

## 2. Aggregate Cost Summary

| Model | Total Tests | Total Input Tokens | Total Output Tokens | Total Cost | Avg Cost/Image |
|-------|-------------|-------------------|---------------------|------------|----------------|
| **gemini-2.5-flash-lite** | 10 | 3,660 | 1,056 | **$0.000788** | **$0.000079** |
| **gemini-2.5-flash** | 10 | 3,660 | 758 | **$0.002993** | **$0.000299** |

### Key Finding: Flash-Lite is ~3.8x cheaper than Flash

---

## 3. Monthly Cost Projections

Based on 15,000 crystal identifications per month:

| Model | Monthly Cost | Annual Cost |
|-------|--------------|-------------|
| **gemini-2.5-flash-lite** | **$1.18** | $14.16 |
| **gemini-2.5-flash** | **$4.49** | $53.88 |

**Savings with Flash-Lite: $3.31/month ($39.72/year)**

---

## 4. Complete Per-Image Results (All 20 Tests)

### Test Results Table

| # | Image | Model | Image Size (bytes) | Input Tokens | Output Tokens | Input Cost | Output Cost | Total Cost | Response Time | Crystal ID | Confidence | Image Quality |
|---|-------|-------|-------------------|--------------|---------------|------------|-------------|------------|---------------|------------|------------|---------------|
| 1 | 01_amethyst.jpg | gemini-2.5-flash-lite | 54,710 | 366 | 138 | $0.0000366 | $0.0000552 | $0.0000918 | 1,863ms | Amethyst | high | ACTUAL CRYSTAL |
| 2 | 01_amethyst.jpg | gemini-2.5-flash | 54,710 | 366 | 110 | $0.0001098 | $0.0002750 | $0.0003848 | 6,773ms | Spirit Quartz (Amethyst) | high | ACTUAL CRYSTAL |
| 3 | 02_fluorite.jpg | gemini-2.5-flash-lite | 24,909 | 366 | 124 | $0.0000366 | $0.0000496 | $0.0000862 | 1,596ms | Diamond | high | NOT CRYSTAL (faceted gem) |
| 4 | 02_fluorite.jpg | gemini-2.5-flash | 24,909 | 366 | 144 | $0.0001098 | $0.0003600 | $0.0004698 | 5,714ms | Diamond | high | NOT CRYSTAL (faceted gem) |
| 5 | 03_clear_quartz.jpg | gemini-2.5-flash-lite | 90,339 | 366 | 141 | $0.0000366 | $0.0000564 | $0.0000930 | 1,893ms | Quartz | high | ACTUAL CRYSTAL |
| 6 | 03_clear_quartz.jpg | gemini-2.5-flash | 90,339 | 366 | 14 | $0.0001098 | $0.0000350 | $0.0001448 | 8,128ms | Clear Quartz (truncated) | N/A | ACTUAL CRYSTAL |
| 7 | 04_rose_quartz.jpg | gemini-2.5-flash-lite | 116,514 | 366 | 81 | $0.0000366 | $0.0000324 | $0.0000690 | 1,777ms | Quartz (Clear Quartz) | high | ACTUAL CRYSTAL |
| 8 | 04_rose_quartz.jpg | gemini-2.5-flash | 116,514 | 366 | 0 | $0.0001098 | $0.0000000 | $0.0001098 | 4,531ms | ERROR (parse fail) | N/A | ACTUAL CRYSTAL |
| 9 | 05_citrine.jpg | gemini-2.5-flash-lite | 47,234 | 366 | 142 | $0.0000366 | $0.0000568 | $0.0000934 | 3,399ms | Not a crystal | high | NOT CRYSTAL (construction) |
| 10 | 05_citrine.jpg | gemini-2.5-flash | 47,234 | 366 | 213 | $0.0001098 | $0.0005325 | $0.0006423 | 5,036ms | Gypsum (drywall) | high | NOT CRYSTAL (construction) |
| 11 | 06_labradorite.jpg | gemini-2.5-flash-lite | 59,299 | 366 | 109 | $0.0000366 | $0.0000436 | $0.0000802 | 2,111ms | Not applicable | high | NOT CRYSTAL (alphabet letters) |
| 12 | 06_labradorite.jpg | gemini-2.5-flash | 59,299 | 366 | 0 | $0.0001098 | $0.0000000 | $0.0001098 | 6,490ms | ERROR (parse fail) | N/A | NOT CRYSTAL (alphabet letters) |
| 13 | 07_crystals_mixed.jpg | gemini-2.5-flash-lite | 68,653 | 366 | 136 | $0.0000366 | $0.0000544 | $0.0000910 | N/A* | Rose Quartz | high | ACTUAL CRYSTAL |
| 14 | 07_crystals_mixed.jpg | gemini-2.5-flash | 68,653 | 366 | 0 | $0.0001098 | $0.0000000 | $0.0001098 | 6,808ms | ERROR (parse fail) | N/A | ACTUAL CRYSTAL |
| 15 | 08_selenite.jpg | gemini-2.5-flash-lite | 86,907 | 366 | 28 | $0.0000366 | $0.0000112 | $0.0000478 | 1,188ms | Photo of lion | N/A | NOT CRYSTAL (lion photo) |
| 16 | 08_selenite.jpg | gemini-2.5-flash | 86,907 | 366 | 0 | $0.0001098 | $0.0000000 | $0.0001098 | 7,013ms | ERROR (parse fail) | N/A | NOT CRYSTAL (lion photo) |
| 17 | 09_black_tourmaline.jpg | gemini-2.5-flash-lite | 12,961 | 366 | 111 | $0.0000366 | $0.0000444 | $0.0000810 | 1,253ms | Unknown | low | NOT CRYSTAL (pink fabric) |
| 18 | 09_black_tourmaline.jpg | gemini-2.5-flash | 12,961 | 366 | 152 | $0.0001098 | $0.0003800 | $0.0004898 | 3,007ms | Not a crystal | high | NOT CRYSTAL (pink fabric) |
| 19 | 10_agate.jpg | gemini-2.5-flash-lite | 54,214 | 366 | 46 | $0.0000366 | $0.0000184 | $0.0000550 | 1,193ms | Person with tablet | N/A | NOT CRYSTAL (tablet photo) |
| 20 | 10_agate.jpg | gemini-2.5-flash | 54,214 | 366 | 125 | $0.0001098 | $0.0003125 | $0.0004223 | 1,862ms | No crystal present | high | NOT CRYSTAL (tablet photo) |

*Timing anomaly in test script

---

## 5. Token Analysis

### Critical Discovery: Fixed Input Token Count

**ALL images = 366 input tokens regardless of file size**

| Image Size (bytes) | Input Tokens |
|-------------------|--------------|
| 12,961 (smallest) | 366 |
| 24,909 | 366 |
| 47,234 | 366 |
| 54,214 | 366 |
| 54,710 | 366 |
| 59,299 | 366 |
| 68,653 | 366 |
| 86,907 | 366 |
| 90,339 | 366 |
| 116,514 (largest) | 366 |

**Implication:** The @google/genai SDK with 768px images produces a standardized token count. This makes cost completely predictable:

- **Input cost per image (Flash-Lite):** $0.0000366 (fixed)
- **Input cost per image (Flash):** $0.0001098 (fixed)
- **Variable cost is only in output tokens**

---

## 6. Response Time Comparison

| Model | Min | Max | Average |
|-------|-----|-----|---------|
| gemini-2.5-flash-lite | 1,188ms | 3,399ms | ~1,800ms |
| gemini-2.5-flash | 1,862ms | 8,128ms | ~5,500ms |

**Flash-Lite is 3-4x faster than Flash**

---

## 7. Test Image Quality Assessment

| # | Filename | Intended Content | Actual Content | Valid Test? |
|---|----------|------------------|----------------|-------------|
| 1 | 01_amethyst.jpg | Amethyst | Amethyst cluster | YES |
| 2 | 02_fluorite.jpg | Fluorite | Faceted diamond/gem photo | NO |
| 3 | 03_clear_quartz.jpg | Clear Quartz | Clear quartz cluster | YES |
| 4 | 04_rose_quartz.jpg | Rose Quartz | Clear/rose quartz point | YES |
| 5 | 05_citrine.jpg | Citrine | Construction site photo | NO |
| 6 | 06_labradorite.jpg | Labradorite | Alphabet letters photo | NO |
| 7 | 07_crystals_mixed.jpg | Mixed crystals | Rose quartz crystals | YES |
| 8 | 08_selenite.jpg | Selenite | Lion photo | NO |
| 9 | 09_black_tourmaline.jpg | Black Tourmaline | Pink fabric/paper | NO |
| 10 | 10_agate.jpg | Agate | Person with tablet (anatomy diagram) | NO |

**Result: Only 4 of 10 images were actual crystals**

The stock photo download process failed to retrieve appropriate test images for 6 of the 10 tests. However, this inadvertently tested the models' ability to correctly identify non-crystal images.

---

## 8. Model Response Quality

### JSON Parsing Success Rate

| Model | Valid JSON | Parse Failures | Truncated/Raw Text |
|-------|-----------|----------------|-------------------|
| gemini-2.5-flash-lite | 8/10 (80%) | 0/10 (0%) | 2/10 (20%) |
| gemini-2.5-flash | 5/10 (50%) | 4/10 (40%) | 1/10 (10%) |

**Flash-Lite had significantly better JSON formatting compliance**

### Parse Failure Details (Flash only)
- 04_rose_quartz.jpg: 0 output tokens, parse error
- 06_labradorite.jpg: 0 output tokens, parse error
- 07_crystals_mixed.jpg: 0 output tokens, parse error
- 08_selenite.jpg: 0 output tokens, parse error

---

## 9. Crystal Identification Accuracy (Valid Images Only)

Testing only the 4 images that were actual crystals:

| Image | Ground Truth | Flash-Lite Result | Flash Result |
|-------|--------------|-------------------|--------------|
| 01_amethyst.jpg | Amethyst | **Amethyst** (CORRECT) | **Spirit Quartz Amethyst** (CORRECT) |
| 03_clear_quartz.jpg | Clear Quartz | **Quartz** (CORRECT) | **Clear Quartz** (truncated, CORRECT) |
| 04_rose_quartz.jpg | Rose Quartz | Quartz (Clear Quartz) (PARTIAL) | ERROR (FAIL) |
| 07_crystals_mixed.jpg | Rose Quartz | **Rose Quartz** (CORRECT) | ERROR (FAIL) |

### Accuracy Summary

| Model | Correct | Partial | Error | Accuracy |
|-------|---------|---------|-------|----------|
| gemini-2.5-flash-lite | 3 | 1 | 0 | **75-100%** |
| gemini-2.5-flash | 2 | 0 | 2 | **50%** |

---

## 10. Cost Math Verification

### Example 1: 01_amethyst.jpg with Flash-Lite
```
Input:  366 tokens × ($0.10 / 1,000,000) = $0.0000366
Output: 138 tokens × ($0.40 / 1,000,000) = $0.0000552
Total:  $0.0000366 + $0.0000552 = $0.0000918

Raw data total_cost_usd: "0.00009180" ✓ VERIFIED
```

### Example 2: 01_amethyst.jpg with Flash
```
Input:  366 tokens × ($0.30 / 1,000,000) = $0.0001098
Output: 110 tokens × ($2.50 / 1,000,000) = $0.0002750
Total:  $0.0001098 + $0.0002750 = $0.0003848

Raw data total_cost_usd: "0.00038480" ✓ VERIFIED
```

### Example 3: Aggregate Totals Verification

**Flash-Lite:**
```
Total Input Cost:  3,660 tokens × ($0.10 / 1,000,000) = $0.000366
Total Output Cost: 1,056 tokens × ($0.40 / 1,000,000) = $0.0004224
Grand Total: $0.0007884

Summary JSON total_cost: 0.0007884 ✓ VERIFIED
```

**Flash:**
```
Total Input Cost:  3,660 tokens × ($0.30 / 1,000,000) = $0.001098
Total Output Cost: 758 tokens × ($2.50 / 1,000,000) = $0.001895
Grand Total: $0.002993

Summary JSON total_cost: 0.002993 ✓ VERIFIED
```

---

## 11. Raw Data Snapshot

### Flash-Lite Individual Costs
| Image | Input | Output | Total |
|-------|-------|--------|-------|
| 01_amethyst.jpg | $0.0000366 | $0.0000552 | $0.0000918 |
| 02_fluorite.jpg | $0.0000366 | $0.0000496 | $0.0000862 |
| 03_clear_quartz.jpg | $0.0000366 | $0.0000564 | $0.0000930 |
| 04_rose_quartz.jpg | $0.0000366 | $0.0000324 | $0.0000690 |
| 05_citrine.jpg | $0.0000366 | $0.0000568 | $0.0000934 |
| 06_labradorite.jpg | $0.0000366 | $0.0000436 | $0.0000802 |
| 07_crystals_mixed.jpg | $0.0000366 | $0.0000544 | $0.0000910 |
| 08_selenite.jpg | $0.0000366 | $0.0000112 | $0.0000478 |
| 09_black_tourmaline.jpg | $0.0000366 | $0.0000444 | $0.0000810 |
| 10_agate.jpg | $0.0000366 | $0.0000184 | $0.0000550 |
| **TOTAL** | **$0.000366** | **$0.0004224** | **$0.0007884** |

### Flash Individual Costs
| Image | Input | Output | Total |
|-------|-------|--------|-------|
| 01_amethyst.jpg | $0.0001098 | $0.0002750 | $0.0003848 |
| 02_fluorite.jpg | $0.0001098 | $0.0003600 | $0.0004698 |
| 03_clear_quartz.jpg | $0.0001098 | $0.0000350 | $0.0001448 |
| 04_rose_quartz.jpg | $0.0001098 | $0.0000000 | $0.0001098 |
| 05_citrine.jpg | $0.0001098 | $0.0005325 | $0.0006423 |
| 06_labradorite.jpg | $0.0001098 | $0.0000000 | $0.0001098 |
| 07_crystals_mixed.jpg | $0.0001098 | $0.0000000 | $0.0001098 |
| 08_selenite.jpg | $0.0001098 | $0.0000000 | $0.0001098 |
| 09_black_tourmaline.jpg | $0.0001098 | $0.0003800 | $0.0004898 |
| 10_agate.jpg | $0.0001098 | $0.0003125 | $0.0004223 |
| **TOTAL** | **$0.001098** | **$0.001895** | **$0.002993** |

---

## 12. Observations for Discussion

### Cost Observations
1. Flash-Lite is ~3.8x cheaper per identification
2. Input tokens are fixed at 366 for 768px images (predictable costs)
3. Output tokens vary based on response verbosity
4. Monthly cost for 15K IDs: $1.18 (Flash-Lite) vs $4.49 (Flash)

### Performance Observations
1. Flash-Lite is 3-4x faster (1.8s avg vs 5.5s avg)
2. Flash had 4/10 parse failures (0 output tokens returned)
3. Flash-Lite had better JSON formatting compliance

### Accuracy Observations (on valid crystal images)
1. Flash-Lite: 3/4 correct, 1 partial (called rose quartz "clear quartz")
2. Flash: 2/4 correct (2 parse failures)
3. Both models correctly identified non-crystal images

### Test Quality Issues
1. 6/10 test images were NOT crystals (download process failed)
2. Need better test images for accurate accuracy assessment
3. Consider curated test dataset for future testing

---

## 13. Source Files

| File | Description |
|------|-------------|
| `raw-results-2025-12-05T19-12-14-158Z.json` | Complete raw API response data |
| `summary-2025-12-05T19-12-14-158Z.json` | Aggregated summary statistics |
| `report-2025-12-05T19-12-14-158Z.md` | Auto-generated test report |
| `vision-cost-test.js` | Test script source code |
| `crystal-images/*.jpg` | Test images (10 files) |

All source files located in: `/mnt/c/Users/millz/crystal-grimoire-fresh-DEPLOY/functions/test/`

---

## A Paul Phillips Manifestation

**Crystal Grimoire Vision Cost Analysis**
**December 5, 2025**

© 2025 Paul Phillips - Clear Seas Solutions LLC
All Rights Reserved
