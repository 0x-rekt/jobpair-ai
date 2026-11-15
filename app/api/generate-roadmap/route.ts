import { generateRoadmap } from "@/lib/generateRoadmap";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@google/genai";

export async function POST(req: NextRequest) {
  const { userInput } = await req.json();
  const { userId, has } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  await prisma.user.upsert({
    where: { clerkId: userId },
    update: {},
    create: { clerkId: userId, email: "" },
  });

  const TOOL_NAME = "ROADMAP_GENERATOR";
  const toolUsageCount = await prisma.userHistory.count({
    where: {
      userId,
      tool: TOOL_NAME,
    },
  });

  if (!has({ plan: "premium" }) && toolUsageCount >= 5) {
    return new Response("Upgrade required", { status: 403 });
  }

  try {
    const generatedRoadmap = await generateRoadmap(userInput);

    await prisma.userHistory.create({
      data: {
        userId: userId!,
        tool: "ROADMAP_GENERATOR",
        input: userInput,
        output: generatedRoadmap,
      },
    });
    return new NextResponse(JSON.stringify(generatedRoadmap), { status: 200 });
  } catch (error) {
    console.error("[ROADMAP_ERROR]", error);
    if (error instanceof ApiError && error.status === 503) {
      return NextResponse.json(
        { error: "The AI service is temporarily busy. Please try again." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Failed to generate roadmap" },
      { status: 500 },
    );
  }
}
