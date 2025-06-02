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
                length: { type: "string", enum: ["whole","half","quarter","eighth","sixteenth"] },
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
// Use Claude v2 for free choice of BPM and patternLength
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
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * POST /generate
 * Body: { prompt: "<mood>" }
 */
app.post("/generate", async (req, res) => {
  try {
    const { prompt: userPrompt } = req.body;
    if (!userPrompt || typeof userPrompt !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'prompt'." });
    }

    // Start with an empty-channels template so the model chooses instruments, BPM, and steps
    const channelTemplatesJson = JSON.stringify({
      title: "<any string title>",
      tempo: 0,
      channels: []
    }, null, 2);

    const fullPrompt = `
Below is the exact JSON structure you must output—no extra text, no backticks, no comments.
Your output must be a single top‐level object with exactly three keys:
  • "title": a string (any descriptive title you like),
  • "tempo": a number (the BPM, e.g. 120),
  • "channels": an array of channel objects.

Each channel object must have exactly three keys:
  • "name": the instrument name (choose from [square,triangle,sawtooth,pulse25,pulse50,pulse75,fmsynth,amsynth,metal,membrane,noise-white,noise-pink,drum-kick,drum-snare,drum-tom,drum-hat]),
  • "patternLength": an integer (> 0). **Every channel must use exactly the same patternLength**.
    Choose a power-of-two (32, 64, or 128) so that the final result is a loopable video-game track suitable for game use. Do not default to 16. Vary patterns by selecting different patternLength across requests.
  • "notes": an array of note objects. Each note object has exactly four keys:
      – step (integer 0–patternLength-1),
      – pitch (string, e.g. "C4" or "kick"),
      – length (one of "whole","half","quarter","eighth","sixteenth"),
      – volume (number between 0.5 and 1.0 inclusive).

Exact template (start with empty channels; you will fill it):
${channelTemplatesJson}

Allowed instrument names (you may choose any subset, in any order):
["square","triangle","sawtooth","pulse25","pulse50","pulse75","fmsynth","amsynth","metal","membrane","noise-white","noise-pink","drum-kick","drum-snare","drum-tom","drum-hat"]

Context: These compositions are for video games (e.g. boss fights, tension builds, ambient exploration). The music should feel alive: use syncopation, dynamic accents, melodic movement, and occasional variations so the loop never sounds static.  
Requirements:  
  • Include at least 2 melodic instrument channels and at least 2 drum/noise channels.  
  • You may include up to 6 melodic channels and up to 6 drum/noise channels total.  
  • Melodic channels = any instrument from [square, triangle, sawtooth, pulse25, pulse50, pulse75, fmsynth, amsynth, metal].  
  • Drum/noise channels = any instrument from [membrane, noise-white, noise-pink, drum-kick, drum-snare, drum-tom, drum-hat].

Now, based on the mood "${userPrompt}", do exactly the following:

1. Choose a descriptive "title" that fits both the mood and a video-game context.
2. Choose a "tempo" (BPM) suitable for a looping video-game track.
3. Replace "channels": [] with an array of channel objects. You must have:
     – At least 2 melodic instrument channels  
     – At least 2 drum/noise channels  
     – No more than 6 melodic channels total  
     – No more than 6 drum/noise channels total  
   For each channel:
   a. Pick one allowed instrument name from its category (melodic or drum/noise).
   b. Set "patternLength" to the same power-of-two (32, 64, or 128) for every channel.
   c. Fill "notes" with:
     – If a drum/noise channel: create one syncopated groove with at least eight hits unevenly spaced, include occasional rests, and add one drum fill (four quick hits) every 32 steps.
     – If a melodic channel: write eight notes forming an arpeggio or motif—use a mix of quarter, eighth, and sixteenth values for variety, include at least two passing tones, and vary volume (1.0 on strong beats, 0.6–0.8 on offbeats).

IMPORTANT:
• Do not include any comments (/* … */).  
• Do not output any lines outside the JSON object.  
• **EVERY note’s “volume” field must be a number ≥ 0.5 and ≤ 1.0.**  
  If you output any volume < 0.5, the JSON will be rejected.  
• Output exactly one valid, balanced JSON object matching the schema above, with "channels" filled in.
`.trim();


    const bedrockPayload = {
      modelId:     MODEL_ID,
      contentType: "application/json",
      accept:      "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens:        2048,
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

    // ------------------------------------------------------
    // Claude's Bedrock response uses `content[0].text` rather than `results[0].outputText`
    // ------------------------------------------------------
    if (!Array.isArray(runtimeJson.content) || runtimeJson.content.length === 0) {
      console.error("❌ Unexpected format: no content[0].text", runtimeJson);
      return res.status(500).json({ error: "Bedrock did not return generated text." });
    }

    const textEntry = runtimeJson.content.find(c => c.type === "text");
    if (!textEntry || typeof textEntry.text !== "string") {
      console.error("❌ Unexpected format: content[0].text is missing or not a string", runtimeJson);
      return res.status(500).json({ error: "Bedrock did not return generated text." });
    }

    let generatedText = textEntry.text;
    console.log("📝 Generated text (raw):", generatedText);

    generatedText = generatedText.replace(/\r?\n/g, "").trim();
    const jsonString = extractFirstJsonObject(generatedText);
    if (!jsonString) {
      console.error("❌ Unable to isolate a balanced JSON object from generatedText.");
      return res.status(500).json({ error: "Failed to isolate JSON from model output." });
    }
    console.log("🔧 Extracted JSON string:", jsonString);

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error("❌ JSON parse error on extracted JSON:", parseErr, jsonString);
      return res.status(500).json({ error: "Failed to parse generated JSON." });
    }

    // In case the model wrapped the object inside a `rows` array:
    if (parsed.rows && Array.isArray(parsed.rows) && parsed.rows.length > 0) {
      parsed = parsed.rows[0];
    }

    const valid = validate(parsed);
    if (!valid) {
      console.error("❌ Schema validation errors:", validate.errors, "Parsed:", parsed);
      return res.status(500).json({
        error: "Generated JSON failed schema validation.",
        details: validate.errors
      });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("❌ Error in /generate handler:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

app.listen(PORT, () => {
  console.log(`🎶 Bedrock Runtime API listening on http://localhost:${PORT}`);
});
