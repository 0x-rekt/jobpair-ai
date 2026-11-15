import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

const FASTAPI_URL = process.env.FASTAPI_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  const { userId, has } = await auth();

  const TOOL_NAME = "COVER_LETTER_GENERATOR";

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.upsert({
    where: { clerkId: userId },
    update: {},
    create: { clerkId: userId, email: "" },
  });

  const toolUsageCount = await prisma.userHistory.count({
    where: {
      userId,
      tool: TOOL_NAME,
    },
  });

  if (!has({ plan: "premium" }) && toolUsageCount >= 5) {
    return NextResponse.json({ error: "Upgrade required" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const resume = formData.get("resume") as File;

    if (!resume) {
      return NextResponse.json(
        { error: "Resume file is required." },
        { status: 400 },
      );
    }

    const jobTitle = (formData.get("jobTitle") as string) ?? "";
    const companyName = (formData.get("companyName") as string) ?? "";
    const jobDescription = (formData.get("jobDescription") as string) ?? "";
    const tone = (formData.get("tone") as string) ?? "";
    const length = (formData.get("length") as string) ?? "";

    const proxyForm = new FormData();
    proxyForm.append("resume", resume, resume.name);
    proxyForm.append("jobTitle", jobTitle);
    proxyForm.append("companyName", companyName);
    proxyForm.append("jobDescription", jobDescription);
    proxyForm.append("tone", tone);
    proxyForm.append("length", length);

    const fastapiRes = await fetch(`${FASTAPI_URL}/generate-cover-letter`, {
      method: "POST",
      body: proxyForm,
    });

    if (!fastapiRes.ok) {
      const errText = await fastapiRes.text();
      console.error("[FASTAPI_ERROR]", fastapiRes.status, errText);
      return NextResponse.json(
        { error: errText || "Failed to generate cover letter" },
        { status: fastapiRes.status },
      );
    }

    const { cover_letter: coverLetter, pdf_url: pdfUrl } =
      (await fastapiRes.json()) as {
        cover_letter: Prisma.InputJsonValue;
        pdf_url: string | null;
      };

    await prisma.userHistory.create({
      data: {
        userId,
        tool: "COVER_LETTER_GENERATOR",
        input: {
          jobTitle,
          companyName,
          jobDescription,
          tone,
          length,
        },
        output: {
          coverLetter,
          pdfUrl,
        },
      },
    });

    return NextResponse.json({ coverLetter, pdfUrl }, { status: 200 });
  } catch (error) {
    console.error("[COVER_LETTER_ERROR]", error);
    return NextResponse.json(
      {
        error: "Failed to generate cover letter",
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
