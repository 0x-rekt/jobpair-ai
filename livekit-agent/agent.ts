import "dotenv/config";

import {
  Agent,
  AgentSession,
  AgentSessionEventTypes,
  defineAgent,
  inference,
  log,
  ServerOptions,
  cli,
  type JobContext,
} from "@livekit/agents";
import { fileURLToPath } from "node:url";

type InterviewMetadata = {
  username?: string;
  questions?: string;
};

function getInterviewMetadata(ctx: JobContext): InterviewMetadata {
  const participant = Array.from(ctx.room.remoteParticipants.values())[0];
  if (!participant?.metadata) return {};

  try {
    return JSON.parse(participant.metadata) as InterviewMetadata;
  } catch {
    log().warn("Invalid interview metadata");
    return {};
  }
}

export default defineAgent({
  entry: async (ctx) => {
    const metadata = getInterviewMetadata(ctx);
    const username = metadata.username || "Candidate";
    const questions = metadata.questions || "Ask general questions about the role.";

    const agent = Agent.create({
      instructions: `You are a professional job interviewer conducting a live mock interview.

Candidate name: ${username}

Follow this question flow:
${questions}

Ask one question at a time. Listen carefully to the candidate's complete answer before
responding. Use natural acknowledgements and brief follow-up questions when useful.
Keep every response concise and conversational. Do not speak over the candidate.
After all questions are answered, thank the candidate and politely end the interview.`,
    });

    const session = new AgentSession({
      stt: new inference.STT({
        model: "deepgram/nova-3",
        language: "en",
      }),
      llm: new inference.LLM({
        model: "google/gemini-2.5-flash",
      }),
      tts: new inference.TTS({
        model: "cartesia/sonic-3",
        voice: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
      }),
      turnHandling: {
        interruption: {
          resumeFalseInterruption: true,
          falseInterruptionTimeout: 1000,
          mode: "adaptive",
        },
        endpointing: {
          mode: "dynamic",
          minDelay: 300,
          maxDelay: 3000,
        },
        preemptiveGeneration: {
          enabled: true,
        },
      },
    });

    session.on(AgentSessionEventTypes.Error, (event) => {
      log().error({ error: event.error }, "LiveKit agent session error");
    });

    await session.start({
      agent,
      room: ctx.room,
      inputOptions: {
        audioEnabled: true,
        textEnabled: true,
        deleteRoomOnClose: true,
      },
    });

    await session.say(
      `Hello ${username}, welcome to your mock interview. Let's begin.`,
    );
  },
});

cli.runApp(new ServerOptions({ agent: fileURLToPath(import.meta.url) }));
