import { auth } from "@/auth";
import { comparePassword, hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z
    .string()
    .min(8, { message: "New password must be at least 8 characters." }),
});

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = changePasswordRequestSchema.safeParse(body);

    if (!parsed.success) {
      const message = Object.values(parsed.error.flatten().fieldErrors)
        .flat()
        .join(", ");

      return NextResponse.json({ error: message }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (!user.password) {
      return NextResponse.json(
        { error: "Password sign-in is not enabled for this account." },
        { status: 400 },
      );
    }

    const matches = await comparePassword(parsed.data.currentPassword, user.password);

    if (!matches) {
      return NextResponse.json(
        { error: "Your current password is incorrect." },
        { status: 401 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await hashPassword(parsed.data.newPassword),
      },
    });

    return NextResponse.json({ message: "Password changed successfully." });
  } catch {
    return NextResponse.json(
      { error: "An error occurred while changing your password." },
      { status: 500 },
    );
  }
}
