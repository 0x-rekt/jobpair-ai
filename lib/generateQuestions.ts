import { generateContent } from "@/lib/gemini";

export const generateQuestions = async (
  jobRole: string,
  jobDescription: string,
  level: string,
  type: string,
) => {
  const res = await generateContent({
    config: {
      systemInstruction: `You are an expert in job interviews. Generate interview questions for the given position.

IMPORTANT: You MUST respond ONLY with a valid JSON array of strings. No other text before or after.

Requirements:
- Questions should be appropriate for the ${type} type interview
- Match the difficulty level: ${level}
- No special characters like "/" or "*" that break voice assistants
- Suitable for an AI voice assistant to read aloud
- Generate 5-8 relevant questions

Return ONLY a JSON array, no markdown, no code blocks, no extra text.

Example format:
["Tell me about your experience with React", "How do you handle debugging complex issues?", "Describe a challenging project you worked on"]
`,
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Job Role: ${jobRole}\nJob Description: ${jobDescription}\nLevel: ${level}\nType: ${type}`,
          },
        ],
      },
    ],
  });

  const candidateText = res?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!candidateText) {
    throw new Error("No response from AI model");
  }

  // Extract JSON array from the response
  let rawJson = candidateText;

  // Remove markdown code blocks if present
  rawJson = rawJson
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  // Try to find JSON array in the text
  const jsonMatch = rawJson.match(/\[\s*"[\s\S]*?\]/m);
  if (jsonMatch) {
    rawJson = jsonMatch[0];
  }

  try {
    const parsedJson = JSON.parse(rawJson);
    return parsedJson;
  } catch (parseError) {
    console.error("Failed to parse questions JSON:", {
      error: parseError,
      candidateText: candidateText.substring(0, 200),
      rawJson: rawJson.substring(0, 200),
    });
    throw new Error(
      `Invalid JSON response from AI model. Received: ${candidateText.substring(0, 100)}`,
    );
  }
};
