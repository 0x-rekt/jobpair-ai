import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const generateRoadmap = async (text: string) => {
  const res = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: `Generate a React flow tree-structured learning roadmap for user input position/ skills the following format:
 vertical tree structure with meaningful x/y positions to form a flow

- Structure should be similar to roadmap.sh layout
- Steps should be ordered from fundamentals to advanced
- Include branching for different specializations (if applicable)
- Each node must have a title, short description, and learning resource link
- Use unique IDs for all nodes and edges
- make it more specious node position, 
- Response n JSON format
{
roadmapTitle:'',
description:<3-5 Lines>,
duration:'',
initialNodes : [
{
 id: '1',
 type: 'turbo',
 position: { x: 0, y: 0 },
 data: {
title: 'Step Title',
description: 'Short two-line explanation of what the step covers.',
link: 'Helpful link for learning this step',
 },
},
...
],
initialEdges : [
{
 id: 'e1-2',
 source: '1',
 target: '2',
},
...
];
}

`,
    },
    contents: text,
  });

  const candidateText = res?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!candidateText) {
    throw new Error("No response from AI model");
  }

  // Extract JSON from the response
  let rawJson = candidateText;

  // Remove markdown code blocks if present
  rawJson = rawJson
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  // Try to find JSON object in the text
  const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    rawJson = jsonMatch[0];
  }

  try {
    const parsedJson = JSON.parse(rawJson);
    return parsedJson;
  } catch (parseError) {
    console.error("Failed to parse roadmap JSON:", {
      error: parseError,
      candidateText: candidateText.substring(0, 200),
      rawJson: rawJson.substring(0, 200),
    });
    throw new Error(
      `Invalid JSON response from AI model. Received: ${candidateText.substring(0, 100)}`,
    );
  }
};
