import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { fetchFastApi } from "@/lib/fastapi";

export async function POST(req: NextRequest) {
  try {
    const { userId, has } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    await prisma.user.upsert({
      where: { clerkId: userId },
      update: {},
      create: { clerkId: userId, email: "" },
    });

    const TOOL_NAME = "RESUME_ANALYZER";
    const toolUsageCount = await prisma.userHistory.count({
      where: {
        userId,
        tool: TOOL_NAME,
      },
    });

    if (!has({ plan: "premium" }) && toolUsageCount >= 5) {
      return new Response("Upgrade required", { status: 403 });
    }

    const formData = await req.formData();
    const resume = formData.get("resume") as File;

    if (!resume) {
      return new Response("Resume file missing", { status: 400 });
    }

    const proxyForm = new FormData();
    proxyForm.append("resume", resume, resume.name);

    const fastapiRes = await fetchFastApi("analyze-resume", {
      method: "POST",
      body: proxyForm,
    });

    if (!fastapiRes.ok) {
      const errText = await fastapiRes.text();
      console.error("[FASTAPI_ERROR]", fastapiRes.status, errText);
      return new Response(
        JSON.stringify({ error: errText || "Failed to analyze resume" }),
        { status: fastapiRes.status }
      );
    }

    const { analysis, url } = (await fastapiRes.json()) as {
      analysis: Prisma.InputJsonValue;
      url: string | null;
    };

    await prisma.userHistory.create({
      data: {
        userId,
        tool: "RESUME_ANALYZER",
        input: { filename: resume.name },
        output: analysis,
      },
    });

    return new Response(JSON.stringify({ analysis, url }), {
      status: 200,
    });
  } catch (error) {
    console.error("[ANALYZE_ERROR]", error);
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
