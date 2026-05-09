import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const generateCoverLetter = async (text: string) => {
  const res = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: `
        You are an advanced AI Cover Letter Generator.

        Your task is to write a personalized cover letter based on a candidate’s resume and a job description. Return the output as a JSON object following this exact schema:

        {
          "intro": string,              // 1–2 sentence opening greeting
          "body": string,               // 2–3 paragraphs explaining fit, referencing resume & job
          "closing": string,            // 1–2 sentence enthusiastic closing
          "tone": string,               // e.g., "professional", "enthusiastic"
          "length": string              // e.g., "~250 words"
        }

        ⚠️ Requirements:
        - Output valid JSON only—no markdown or extra keys.
        - Use information from both resume and job description.
        - Extract key achievements from the resumeText automatically.
        - Ensure the tone and length match the input preferences.
        - Be concise, authentic, and contextually relevant.

        📥 INPUT (user message will include):
        - resumeText: the candidate’s resume content (plain text).
        - jobTitle: position title.
        - companyName: name of the company.
        - jobDescription: full or excerpted job posting.
        - tone: desired tone.
        - length: approximate desired length.

        When given these inputs, analyze and craft a tailored cover letter fitting the schema above. Output JSON only.
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
    console.error("Failed to parse cover letter JSON:", {
      error: parseError,
      candidateText: candidateText.substring(0, 200),
      rawJson: rawJson.substring(0, 200),
    });
    throw new Error(
      `Invalid JSON response from AI model. Received: ${candidateText.substring(0, 100)}`,
    );
  }
};
