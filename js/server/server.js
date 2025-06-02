import express from "express";
import cors from "cors";
import Ajv from "ajv";
import dotenv from "dotenv";
import { createRequire } from "module";

dotenv.config();

const requireBedrockRuntime = createRequire(import.meta.url);
const bedrockRuntimePkg    = requireBedrockRuntime("@aws-sdk/client-bedrock-runtime");
const BedrockRuntimeClient = bedrockRuntimePkg.BedrockRuntimeClient;
const InvokeModelCommand   = bedrockRuntimePkg.InvokeModelCommand;

// ── AJV schema for validating the final composition ─────────────────────────────
const compositionSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    tempo: { type: "number" },
    channels: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          patternLength: { type: "number" },
          notes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                step:   { type: "integer", minimum: 0 },
                pitch:  { type: "string" },
                // length can be a named duration or a positive integer (stretched)
                length: {
                  oneOf: [
                    { type: "string", enum: ["whole","half","quarter","eighth","sixteenth"] },
                    { type: "integer", minimum: 1 }
                  ]
                },
                volume: { type: "number", minimum: 0.5, maximum: 1 }
              },
              required: ["step","pitch","length","volume"]
            }
          }
        },
        required: ["name","patternLength","notes"]
      }
    }
  },
  required: ["title","tempo","channels"]
};
const ajv      = new Ajv();
const validate = ajv.compile(compositionSchema);

// ── Bedrock / AWS setup ────────────────────────────────────────────────────────
const AWS_REGION = process.env.AWS_REGION || "us-west-2";
const MODEL_ID   = "anthropic.claude-v2";
const PORT       = process.env.PORT || 3000;

console.log("▶ Using AWS_REGION =", AWS_REGION);
console.log("▶ Using MODEL_ID   =", MODEL_ID);

const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Helper to extract the first balanced JSON object from model output.
 */
function extractFirstJsonObject(text) {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

/**
 * POST /generate
 * Body: { prompt: "<mood or description>" }
 */
app.post("/generate", async (req, res) => {
  try {
    const { prompt: userPrompt } = req.body;
    if (!userPrompt || typeof userPrompt !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'prompt'." });
    }

    // Start with an empty‐channels template so the model chooses instruments, BPM, and steps
    const channelTemplatesJson = JSON.stringify({
      title: "<any string title>",
      tempo: 0,
      channels: []
    }, null, 2);

    // ─────────────────────────────────────────────────────────────────────────────
    // Enhanced prompt: allow numeric lengths (stretched notes) and enforce octave limits (2–7).
    // ─────────────────────────────────────────────────────────────────────────────
    const fullPrompt =
`IMPORTANT: output exactly one valid JSON object and nothing else—no extra prose. Start immediately with “{” and end with “}”.
Below is the exact JSON structure you must output—no extra text, no backticks, no comments.
Your output must be a single top-level object with exactly three keys:
  • "title": a string (any descriptive title you like),
  • "tempo": a number (the BPM, e.g. 120),
  • "channels": an array of channel objects.

Each channel object must have exactly three keys:
  • "name": the instrument name (choose from [square, triangle, sawtooth, pulse25, pulse50, pulse75, fmsynth, amsynth, metal, membrane, noise-white, noise-pink, drum-kick, drum-snare, drum-tom, drum-hat]),
  • "patternLength": an integer (> 0). **Every channel must use exactly the same patternLength** (choose 64 or 128),
  • "notes": an array of note objects. Each note object has exactly four keys:
      – step (integer 0–patternLength-1),
      – pitch (string, e.g. "C4", "kick", or for noise channels, use "noise"),
      – length: either
          • one of the strings "whole", "half", "quarter", "eighth", "sixteenth", or
          • a positive integer number of steps to stretch the note (e.g., 5 means hold for 5 steps),
      – volume (number between 0.5 and 1.0 inclusive).

Exact template (start with empty channels; you will fill it):
${channelTemplatesJson}

Allowed instrument names (you may choose any subset, in any order):
["square","triangle","sawtooth","pulse25","pulse50","pulse75","fmsynth","amsynth","metal","membrane","noise-white","noise-pink","drum-kick","drum-snare","drum-tom","drum-hat"]

Context: These compositions are for video games (e.g. boss fights, tension builds, ambient exploration). The music should be engaging, layered, and “alive”—avoid static loops. Use counter-melodies, call-and-response between channels, evolving rhythmic patterns, and occasional variations so each loop feels dynamic.

Key Selection:
  • If the userPrompt includes “in the key of X major/minor” or “key: X,” generate the entire track in that key.
  • If no key is specified, choose a suitable key (major or minor) based on mood/context. Mention the chosen key in the title (e.g. “Happy Adventure in G Major”).
  • Ensure all melodic pitches use octaves between 2 and 7 inclusive—no notes above 7 or below 2.

Requirements:
  • Exactly 6 total channels: 3 melodic instruments and 3 drum/noise channels.
  • Melodic channels from [square, triangle, sawtooth, pulse25, pulse50, pulse75, fmsynth, amsynth, metal].
  • Drum/noise channels from [membrane, noise-white, noise-pink, drum-kick, drum-snare, drum-tom, drum-hat].
  • All channels share the same patternLength (64 or 128).

For each melodic channel:
  • Write exactly 16 notes total, all belonging to the chosen key and within octaves 2–7.
  • Create a primary melody, plus at least one counter-melody or harmony line that weaves around the main motif.
  • Use a variety of lengths (quarter, eighth, sixteenth) or numeric step values to craft syncopation and rhythmic interest; numeric values allow “stretched” durations.
  • Include at least 4 passing tones and 3 staccato articulations.
  • Distribute notes across the full pattern so each channel evolves from start to finish.
  • Vary volume: 1.0 on strong beats, 0.6–0.8 on passing/offbeat notes.

For each drum/noise channel:
  • Write exactly 20 total hits:
      – At least 14 hits forming an evolving, syncopated groove—avoid repetitive straight‐on‐the‐beat patterns.
      – Two distinct 4‐hit fills of sixteenth notes:
        • First fill at literal steps: if patternLength=64 → [30,31,32,33]; if 128 → [62,63,64,65].
        • Second fill at literal steps: if patternLength=64 → [58,59,60,61]; if 128 → [122,123,124,125].
      – For noise‐based fills, set “pitch” to "noise" (never null).
  • Use a mix of “length” values (e.g. eighth, sixteenth) or numeric step values to simulate realistic 8‐bit drums.
  • Ensure each fill differs from the groove but flows naturally into and out of it.

IMPORTANT:
  • Do NOT include any comments (/* … */).
  • Do NOT output any lines outside the JSON object.
  • EVERY note’s “volume” must be a number ≥ 0.5 and ≤ 1.0.
  • Output exactly one valid, balanced JSON object matching the schema above, with “channels” filled in.

Now, based on the prompt:
  "${userPrompt}"
do exactly the above instructions.`;

    const bedrockPayload = {
      modelId:     MODEL_ID,
      contentType: "application/json",
      accept:      "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens:        3500,
        temperature:       1.0,
        messages: [
          { role: "user", content: fullPrompt }
        ]
      })
    };

    console.log("⏳ Sending to Bedrock Runtime:", JSON.stringify(bedrockPayload, null, 2));
    const command  = new InvokeModelCommand(bedrockPayload);
    const response = await bedrockClient.send(command);
    const respText = await response.body.transformToString();
    console.log("✅ Bedrock Runtime responded (raw):", respText);

    if (!respText) {
      console.error("❌ Bedrock returned empty content:", response);
      return res.status(500).json({ error: "Empty response from Bedrock." });
    }

    let runtimeJson;
    try {
      runtimeJson = JSON.parse(respText);
    } catch (err) {
      console.error("❌ Failed to JSON.parse Bedrock response:", err, respText);
      return res.status(500).json({ error: "Invalid JSON from Bedrock." });
    }

    if (!Array.isArray(runtimeJson.content) || runtimeJson.content.length === 0) {
      console.error("❌ Unexpected format: no content[0].text", runtimeJson);
      return res.status(500).json({ error: "Bedrock did not return generated text." });
    }

    const textEntry = runtimeJson.content.find(c => c.type === "text");
    if (!textEntry || typeof textEntry.text !== "string") {
      console.error("❌ Unexpected format: textEntry.text is missing or not a string", runtimeJson);
      return res.status(500).json({ error: "Bedrock did not return generated text." });
    }

    // Log the raw text so we can inspect exactly what the model returned
    console.log("📝 [raw model output start]:\n" + textEntry.text + "\n[raw model output end]");

    // Trim only leading/trailing whitespace (do NOT strip newlines in the middle yet)
    let generatedText = textEntry.text.trim();

    // Extract the first balanced JSON object
    const jsonString = extractFirstJsonObject(generatedText);
    if (!jsonString) {
      console.error("❌ Unable to isolate a balanced JSON object from generatedText:\n", generatedText);
      return res.status(500).json({ error: "Failed to isolate JSON from model output." });
    }

    console.log("🔧 Extracted JSON string:", jsonString);

    // Sanity-check that braces match
    const opens  = (jsonString.match(/{/g) || []).length;
    const closes = (jsonString.match(/}/g) || []).length;
    if (opens !== closes) {
      console.error(`❌ Braces mismatch (opened=${opens}, closed=${closes}):`, jsonString);
      return res.status(500).json({ error: "Unbalanced braces in extracted JSON." });
    }

    // Parse into JS object
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error("❌ JSON.parse error on extracted JSON:", parseErr, jsonString);
      return res.status(500).json({ error: "Failed to parse generated JSON." });
    }

    // If the model wrapped it in a “rows” array, unwrap it
    if (parsed.rows && Array.isArray(parsed.rows) && parsed.rows.length > 0) {
      parsed = parsed.rows[0];
    }

    // Validate against AJV schema
    const valid = validate(parsed);
    if (!valid) {
      console.error("❌ Schema validation errors:", validate.errors, "Parsed:", parsed);
      return res.status(500).json({
        error: "Generated JSON failed schema validation.",
        details: validate.errors
      });
    }

    // Return the clean object
    return res.status(200).json(parsed);

  } catch (err) {
    console.error("❌ Error in /generate handler:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

app.listen(PORT, () => {
  console.log(`🎶 Bedrock Runtime API listening on http://localhost:${PORT}`);
});
