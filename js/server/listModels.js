// listModels.js
import { BedrockRuntimeClient, ListModelsCommand } from "@aws-sdk/client-bedrock-runtime";
import dotenv from "dotenv";

dotenv.config();
const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-west-2" });

async function listModels() {
  try {
    // Note: Bedrock Runtime does not publicly document a "ListModelsCommand" 
    // in the same way as other services; if this fails,
    // fall back to using the Console approach above.
    const cmd = new ListModelsCommand({}); 
    const resp = await client.send(cmd);
    console.log("Available modelIds:\n", resp.modelSummaries?.map(m => m.modelId).join("\n"));
  } catch (err) {
    console.error("Could not list models via SDK (likely not supported). Please check the Bedrock Console instead.\n", err);
  }
}

listModels();