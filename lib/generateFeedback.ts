import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

type TranscriptMessage = {
  role?: string;
  content?: string;
  transcript?: string;
};

const formatTranscript = (answers: string | TranscriptMessage[]) => {
  if (typeof answers === "string") {
    return answers;
  }

  return answers
    .map((message) => {
      const role = message.role ?? "unknown";
      const content = message.content ?? message.transcript ?? "";
      return `${role.toUpperCase()}: ${content}`.trim();
    })
    .filter(Boolean)
    .join("\n");
};

export const generateInterviewFeedback = async (
  jobRole: string,
  jobDescription: string,
  level: string,
  type: string,
  questions: string,
  answers: string | TranscriptMessage[],
) => {
  const transcript = formatTranscript(answers);

  const res = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: {
          Overall_Score: { type: "number" },
          Communication: { type: "number" },
          Technical_Knowledge: { type: "number" },
          Problem_Solving: { type: "number" },
          Leadership: { type: "number" },
          Collaboration: { type: "number" },
          Creativity: { type: "number" },
          Adaptability: { type: "number" },
          strengths: {
            type: "array",
            items: { type: "string" },
          },
          improvements: {
            type: "array",
            items: { type: "string" },
          },
          summary: { type: "string" },
        },
        required: [
          "Overall_Score",
          "Communication",
          "Technical_Knowledge",
          "Problem_Solving",
          "Leadership",
          "Collaboration",
          "Creativity",
          "Adaptability",
          "strengths",
          "improvements",
          "summary",
        ],
        additionalProperties: false,
      },
      systemInstruction: `You are a professional interviewer analyzing a mock interview for a ${jobRole} position.
The job description is: ${jobDescription}
The level of experience is: ${level}
The type of interview is: ${type}

IMPORTANT: You MUST respond ONLY with valid JSON. No other text before or after the JSON.

Your job is to evaluate the candidate based on the provided questions and answers.

Score the candidate on a scale of 0-100 in these categories ONLY:
- Overall_Score
- Communication
- Technical_Knowledge
- Problem_Solving
- Leadership
- Collaboration
- Creativity
- Adaptability

Also provide:
- strengths: array of 3-5 key strengths
- improvements: array of 3-5 areas for improvement
- summary: 1-2 sentence overall assessment

Be fair and constructive. Output ONLY valid JSON, no markdown, no code blocks, no extra text.

Example format:
{"Overall_Score": 75, "Communication": 80, "Technical_Knowledge": 70, "Problem_Solving": 75, "Leadership": 70, "Collaboration": 80, "Creativity": 65, "Adaptability": 75, "strengths": ["Good communication", "Technical depth"], "improvements": ["Time management", "Confidence"], "summary": "Overall solid performance with room for growth."}
`,
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Questions:\n${questions}\n\nTranscript:\n${transcript}`,
          },
        ],
      },
    ],
  });

  const candidateText = res?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!candidateText) {
    throw new Error("No response from AI model");
  }

  // Extract JSON from the response - handle various formats
  let rawJson = candidateText;

  // Remove markdown code blocks if present
  rawJson = rawJson
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  try {
    const parsedJson = JSON.parse(rawJson);
    return parsedJson;
  } catch (parseError) {
    console.error("Failed to parse feedback JSON:", {
      error: parseError,
      candidateText: candidateText.substring(0, 200), // Log first 200 chars for debugging
      rawJson: rawJson.substring(0, 200),
    });
    throw new Error(
      `Invalid JSON response from AI model. Received: ${candidateText.substring(0, 100)}`,
    );
  }
};
