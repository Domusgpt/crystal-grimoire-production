/**
 * Crystal Grimoire Vision Cost & Accuracy Test
 *
 * Tests Gemini vision models at various configurations to measure:
 * - Actual token usage (input/output)
 * - Actual cost per identification
 * - Crystal identification result
 *
 * Configurations tested:
 * A: 2.5 Flash-Lite + 768px resize (default resolution)
 * B: 2.5 Flash + 768px resize (default resolution)
 *
 * Using @google/genai SDK
 */

const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Pricing per 1M tokens (December 2025)
const PRICING = {
  'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
  'gemini-2.5-flash': { input: 0.30, output: 2.50 }
};

// Test configurations - simplified to what actually works
const CONFIGS = [
  { id: 'A', model: 'gemini-2.5-flash-lite', desc: '2.5 Flash-Lite (768px)' },
  { id: 'B', model: 'gemini-2.5-flash', desc: '2.5 Flash (768px)' }
];

// Crystal identification prompt
const CRYSTAL_PROMPT = `Identify this crystal/mineral specimen. Provide:
1. Crystal name (most likely identification)
2. Confidence level (low/medium/high)
3. Key identifying features you observed
4. Alternative possibilities if uncertain

Return as JSON:
{
  "crystal_name": "string",
  "confidence": "low|medium|high",
  "identifying_features": ["feature1", "feature2"],
  "alternatives": ["alt1", "alt2"]
}`;

async function resizeTo768(imagePath) {
  const resized = await sharp(imagePath)
    .resize(768, 768, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  return resized;
}

async function testConfig(ai, config, imageBuffer, imageName) {
  const base64Image = imageBuffer.toString('base64');
  const startTime = Date.now();

  try {
    const response = await ai.models.generateContent({
      model: config.model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: CRYSTAL_PROMPT },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }
      ],
      config: {
        maxOutputTokens: 1024,
        temperature: 0.4
      }
    });

    const responseTime = Date.now() - startTime;

    // Get usage metadata
    const usage = response.usageMetadata || {};
    const inputTokens = usage.promptTokenCount || 0;
    const outputTokens = usage.candidatesTokenCount || 0;

    // Calculate actual cost
    const pricing = PRICING[config.model];
    const inputCost = (inputTokens / 1000000) * pricing.input;
    const outputCost = (outputTokens / 1000000) * pricing.output;
    const totalCost = inputCost + outputCost;

    // Parse response
    let crystalResult = {};
    try {
      const text = response.text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        crystalResult = JSON.parse(jsonMatch[0]);
      } else {
        crystalResult = { raw_response: text };
      }
    } catch (e) {
      crystalResult = { parse_error: e.message, raw: response.text };
    }

    return {
      config_id: config.id,
      config_desc: config.desc,
      model: config.model,
      image: imageName,
      image_size_bytes: imageBuffer.length,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      input_cost_usd: inputCost.toFixed(8),
      output_cost_usd: outputCost.toFixed(8),
      total_cost_usd: totalCost.toFixed(8),
      response_time_ms: responseTime,
      crystal_result: crystalResult,
      error: null
    };
  } catch (error) {
    return {
      config_id: config.id,
      config_desc: config.desc,
      model: config.model,
      image: imageName,
      image_size_bytes: imageBuffer.length,
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      input_cost_usd: '0',
      output_cost_usd: '0',
      total_cost_usd: '0',
      response_time_ms: Date.now() - startTime,
      crystal_result: null,
      error: error.message
    };
  }
}

async function runTests() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY environment variable not set');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  const imagesDir = path.join(__dirname, 'crystal-images');
  const images = fs.readdirSync(imagesDir).filter(f => f.endsWith('.jpg'));

  console.log(`Found ${images.length} test images`);
  console.log(`Testing ${CONFIGS.length} configurations`);
  console.log('---');

  const results = [];
  const summaryByConfig = {};

  for (const config of CONFIGS) {
    summaryByConfig[config.id] = {
      config: config.desc,
      model: config.model,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cost: 0,
      tests: 0,
      errors: 0
    };
  }

  for (const imageName of images) {
    const imagePath = path.join(imagesDir, imageName);
    console.log(`\nProcessing: ${imageName}`);

    // Resize to 768px (simulating client-side resize)
    const resizedBuffer = await resizeTo768(imagePath);
    console.log(`  Resized to 768px: ${resizedBuffer.length} bytes`);

    for (const config of CONFIGS) {
      console.log(`  Testing config ${config.id}: ${config.desc}...`);

      const result = await testConfig(ai, config, resizedBuffer, imageName);
      results.push(result);

      // Update summary
      if (result.error) {
        summaryByConfig[config.id].errors++;
        console.log(`    ERROR: ${result.error}`);
      } else {
        summaryByConfig[config.id].total_input_tokens += result.input_tokens;
        summaryByConfig[config.id].total_output_tokens += result.output_tokens;
        summaryByConfig[config.id].total_cost += parseFloat(result.total_cost_usd);
        summaryByConfig[config.id].tests++;
        console.log(`    Tokens: ${result.input_tokens} in / ${result.output_tokens} out`);
        console.log(`    Cost: $${result.total_cost_usd}`);
        console.log(`    Result: ${result.crystal_result?.crystal_name || 'N/A'} (${result.crystal_result?.confidence || 'N/A'})`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Generate output files
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(__dirname, 'results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Raw results JSON
  const rawResultsPath = path.join(outputDir, `raw-results-${timestamp}.json`);
  fs.writeFileSync(rawResultsPath, JSON.stringify(results, null, 2));
  console.log(`\nRaw results saved: ${rawResultsPath}`);

  // Summary JSON
  const summaryPath = path.join(outputDir, `summary-${timestamp}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(summaryByConfig, null, 2));
  console.log(`Summary saved: ${summaryPath}`);

  // Human-readable report
  let report = `# Crystal Grimoire Vision Cost Test Results\n\n`;
  report += `**Date:** ${new Date().toISOString()}\n`;
  report += `**Images tested:** ${images.length}\n`;
  report += `**Configurations tested:** ${CONFIGS.length}\n`;
  report += `**Resize:** 768px (client-side simulation)\n\n`;

  report += `## Summary by Configuration\n\n`;
  report += `| Config | Model | Tests | Input Tokens | Output Tokens | Total Cost | Avg Cost/Image | Errors |\n`;
  report += `|--------|-------|-------|--------------|---------------|------------|----------------|--------|\n`;

  for (const config of CONFIGS) {
    const s = summaryByConfig[config.id];
    const avgCost = s.tests > 0 ? (s.total_cost / s.tests).toFixed(6) : 'N/A';
    const avgInput = s.tests > 0 ? Math.round(s.total_input_tokens / s.tests) : 0;
    const avgOutput = s.tests > 0 ? Math.round(s.total_output_tokens / s.tests) : 0;
    report += `| ${config.id} | ${config.model} | ${s.tests} | ${s.total_input_tokens} (avg: ${avgInput}) | ${s.total_output_tokens} (avg: ${avgOutput}) | $${s.total_cost.toFixed(6)} | $${avgCost} | ${s.errors} |\n`;
  }

  report += `\n## Projected Monthly Costs\n\n`;
  report += `Based on 15,000 crystal identifications per month:\n\n`;
  report += `| Config | Model | Monthly Cost |\n`;
  report += `|--------|-------|--------------|\n`;

  for (const config of CONFIGS) {
    const s = summaryByConfig[config.id];
    const avgCost = s.tests > 0 ? s.total_cost / s.tests : 0;
    const monthlyCost = avgCost * 15000;
    report += `| ${config.id} | ${config.model} | $${monthlyCost.toFixed(2)} |\n`;
  }

  report += `\n## Detailed Results by Image\n\n`;

  for (const imageName of images) {
    report += `### ${imageName}\n\n`;
    report += `| Config | Model | Tokens (in/out) | Cost | Crystal ID | Confidence | Features |\n`;
    report += `|--------|-------|-----------------|------|------------|------------|----------|\n`;

    const imageResults = results.filter(r => r.image === imageName);
    for (const r of imageResults) {
      const crystalName = r.crystal_result?.crystal_name || r.error || 'ERROR';
      const confidence = r.crystal_result?.confidence || 'N/A';
      const features = r.crystal_result?.identifying_features?.slice(0, 2).join(', ') || 'N/A';
      report += `| ${r.config_id} | ${r.model} | ${r.input_tokens}/${r.output_tokens} | $${r.total_cost_usd} | ${crystalName} | ${confidence} | ${features.substring(0, 50)} |\n`;
    }
    report += `\n`;
  }

  report += `\n## Raw Token Data\n\n`;
  report += `| Image | Config | Input Tokens | Output Tokens | Image Size (bytes) |\n`;
  report += `|-------|--------|--------------|---------------|--------------------|\n`;
  for (const r of results) {
    if (!r.error) {
      report += `| ${r.image} | ${r.config_id} | ${r.input_tokens} | ${r.output_tokens} | ${r.image_size_bytes} |\n`;
    }
  }

  const reportPath = path.join(outputDir, `report-${timestamp}.md`);
  fs.writeFileSync(reportPath, report);
  console.log(`Report saved: ${reportPath}`);

  console.log('\n=== TEST COMPLETE ===\n');
  console.log('Summary:');
  for (const config of CONFIGS) {
    const s = summaryByConfig[config.id];
    const avgCost = s.tests > 0 ? (s.total_cost / s.tests).toFixed(6) : 'N/A';
    const avgTokens = s.tests > 0 ? Math.round(s.total_input_tokens / s.tests) : 0;
    console.log(`  ${config.id} (${config.desc}): $${avgCost}/image, avg ${avgTokens} input tokens`);
  }
}

runTests().catch(console.error);
