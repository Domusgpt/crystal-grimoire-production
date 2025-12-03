/**
 * Crystal Grimoire - Optimized identifyCrystal Function
 *
 * Based on working gem-id system using:
 * - gemini-2.5-flash (cost-efficient, latest generation)
 * - Structured output schema (guaranteed JSON format)
 * - Database-aligned response format
 *
 * A Paul Phillips Manifestation
 */

const { onCall } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { HttpsError } = require('firebase-functions/v2/https');

const db = getFirestore();

// Structured output schema matching Crystal Grimoire database
const crystalResponseSchema = {
  type: 'object',
  properties: {
    // Crystal identification
    crystal_name: {
      type: 'string',
      description: 'Official mineral/crystal name (e.g., "Amethyst", "Rose Quartz")'
    },
    variety: {
      type: 'string',
      description: 'Specific variety if applicable (e.g., "Amethyst" for purple quartz variety)'
    },
    confidence: {
      type: 'number',
      description: 'Confidence level from 0.0 to 1.0 (0-100%)'
    },
    description: {
      type: 'string',
      description: 'Detailed description of crystal appearance and properties'
    },

    // Colors
    colors: {
      type: 'array',
      items: { type: 'string' },
      description: 'Dominant colors observed (e.g., ["purple", "violet"])'
    },

    // Metaphysical properties (Crystal Grimoire focus)
    metaphysical_properties: {
      type: 'object',
      properties: {
        healing_properties: {
          type: 'array',
          items: { type: 'string' },
          description: 'Spiritual and healing properties'
        },
        primary_chakras: {
          type: 'array',
          items: { type: 'string' },
          description: 'Associated chakras (Root, Sacral, Solar Plexus, Heart, Throat, Third Eye, Crown)'
        },
        element: {
          type: 'string',
          description: 'Associated element: earth, water, fire, or air'
        },
        zodiac_signs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Associated zodiac signs'
        },
        energy_type: {
          type: 'string',
          description: 'Energy classification: grounding, energizing, calming, protecting, or manifesting'
        }
      },
      required: ['healing_properties', 'primary_chakras', 'element', 'zodiac_signs', 'energy_type']
    },

    // Geological data
    geological_data: {
      type: 'object',
      properties: {
        mohs_hardness: {
          type: 'string',
          description: 'Mohs hardness scale (e.g., "7", "5.5-6")'
        },
        chemical_formula: {
          type: 'string',
          description: 'Chemical formula (e.g., "SiO2", "CaCO3")'
        }
      },
      required: ['mohs_hardness', 'chemical_formula']
    },

    // Care instructions
    care_instructions: {
      type: 'object',
      properties: {
        cleansing: {
          type: 'array',
          items: { type: 'string' },
          description: 'Recommended cleansing methods'
        },
        charging: {
          type: 'array',
          items: { type: 'string' },
          description: 'Recommended charging methods'
        },
        storage: {
          type: 'string',
          description: 'Storage recommendations'
        }
      },
      required: ['cleansing', 'charging', 'storage']
    }
  },
  required: ['crystal_name', 'confidence', 'description', 'colors', 'metaphysical_properties', 'geological_data', 'care_instructions']
};

exports.identifyCrystalOptimized = onCall(
  { cors: true, memory: '1GiB', timeoutSeconds: 60, secrets: ['GEMINI_API_KEY'] },
  async (request) => {
    // Authentication check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');

    // Get API key from Secret Manager
    if (!process.env.GEMINI_API_KEY) {
      throw new HttpsError('failed-precondition', 'GEMINI_API_KEY not configured');
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    try {
      const { imageData } = request.data;
      const userId = request.auth.uid;

      if (!imageData) {
        throw new HttpsError('invalid-argument', 'Image data required');
      }

      console.log(`🔍 [OPTIMIZED] Crystal identification for user: ${userId}`);

      // Use gemini-2.5-flash (cost-efficient, modern)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.4,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
          responseSchema: crystalResponseSchema
        }
      });

      const prompt = `You are a world-class gemologist and spiritual guide specializing in crystal identification.

Analyze this crystal image and provide detailed identification including:
- Official mineral name and variety
- Confidence level (0.0 to 1.0)
- Visual description
- Dominant colors
- Metaphysical and spiritual properties (chakras, healing properties, element, zodiac, energy type)
- Geological data (Mohs hardness, chemical formula)
- Care instructions (cleansing, charging, storage)

Focus on accuracy for identification while providing rich metaphysical context for spiritual practitioners.

If no crystal is visible, set crystal_name to "Unknown" and provide details about what is seen instead.`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageData
          }
        }
      ]);

      const responseText = result.response.text();
      const crystalData = JSON.parse(responseText);

      console.log(`✅ Identified: ${crystalData.crystal_name} (confidence: ${crystalData.confidence})`);

      // Format for database (matching Flutter app expectations)
      const candidateEntry = {
        name: crystalData.crystal_name,
        confidence: crystalData.confidence,
        rationale: crystalData.description,
        variety: crystalData.variety || null,
        colors: crystalData.colors,
        metaphysical: crystalData.metaphysical_properties,
        geological: crystalData.geological_data,
        care: crystalData.care_instructions
      };

      // Save to Firestore
      const imagePath = request.data?.imagePath || null;
      const identificationDocument = {
        imagePath,
        candidates: [candidateEntry],
        selected: candidateEntry,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      const identificationRef = await db
        .collection('users')
        .doc(userId)
        .collection('identifications')
        .add(identificationDocument);

      console.log(`💾 Saved identification: ${identificationRef.id}`);

      // Return full crystal data
      return {
        identification: {
          id: identificationRef.id,
          ...crystalData
        },
        success: true
      };

    } catch (error) {
      console.error('❌ Crystal identification error:', error);
      throw new HttpsError('internal', `Identification failed: ${error.message}`);
    }
  }
);
