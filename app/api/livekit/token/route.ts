import { auth } from "@clerk/nextjs/server";
import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomName, username, questions } = (await request.json().catch(() => ({}))) as {
    roomName?: string;
    username?: string;
    questions?: string;
  };

  if (!roomName || !/^[a-zA-Z0-9_-]{1,128}$/.test(roomName)) {
    return NextResponse.json(
      { error: "A valid room name is required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !serverUrl) {
    console.error("[LIVEKIT_CONFIG_ERROR] Missing LiveKit server configuration");
    return NextResponse.json(
      { error: "LiveKit is not configured" },
      { status: 500 },
    );
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    name: userId,
    metadata: JSON.stringify({ userId, username, questions }),
    ttl: "10m",
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return NextResponse.json({
    serverUrl,
    participantToken: await token.toJwt(),
  });
}
