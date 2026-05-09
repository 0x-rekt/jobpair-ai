import { generateInterviewFeedback } from "@/lib/generateFeedback";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { transcript: answers, interviewId } = await req.json();

  console.log("Received feedback generation request:", {
    interviewId,
    answers: Array.isArray(answers) ? answers.slice(0, 5) : "Invalid format", // Log first 5 answers for debugging
  });

  const { userId } = await auth();
  try {
    const interviewDetails = await prisma.interview.findFirst({
      where: {
        id: interviewId,
        userId: userId ?? "",
      },
    });

    console.log("Interview details fetched for feedback generation:", {
      interviewId,
      userId,
      interviewDetails,
    });

    const generatedFeedback = await generateInterviewFeedback(
      interviewDetails?.jobRole ?? "",
      interviewDetails?.jobDescription ?? "",
      interviewDetails?.level ?? "",
      interviewDetails?.type ?? "",
      (interviewDetails?.questions as string) ?? "",
      answers,
    );

    const updatedInterview = await prisma.interview.update({
      where: {
        id: interviewId,
      },
      data: {
        feedback: JSON.stringify(generatedFeedback),
      },
    });

    await prisma.userHistory.create({
      data: {
        userId: userId ?? "",
        tool: "MOCK_INTERVIEW",
        input: [interviewDetails, answers],
        output: generatedFeedback,
      },
    });

    console.log("Feedback generated and interview updated:", {
      interviewId,
      updatedInterview,
    });

    return new NextResponse(JSON.stringify(updatedInterview), { status: 200 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Feedback generation error:", {
      error: errorMessage,
      interviewId,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return new NextResponse(
      JSON.stringify({
        error: "Failed to generate interview feedback",
        details: errorMessage,
      }),
      { status: 500 },
    );
  }
}
