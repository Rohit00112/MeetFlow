import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const resetPasswordRequestSchema = z.object({
  token: z.string().min(1, { message: "Reset token is required." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resetPasswordRequestSchema.safeParse(body);

    if (!parsed.success) {
      const message = Object.values(parsed.error.flatten().fieldErrors)
        .flat()
        .join(", ");

      return NextResponse.json({ error: message }, { status: 400 });
    }

    const passwordReset = await prisma.passwordReset.findUnique({
      where: { token: parsed.data.token },
    });

    if (!passwordReset || passwordReset.expiresAt < new Date()) {
      if (passwordReset) {
        await prisma.passwordReset.delete({ where: { token: passwordReset.token } });
      }

      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: passwordReset.email },
      select: { id: true },
    });

    if (!user) {
      await prisma.passwordReset.deleteMany({ where: { email: passwordReset.email } });

      return NextResponse.json(
        { error: "This reset link is no longer valid." },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await hashPassword(parsed.data.password),
      },
    });

    await prisma.passwordReset.deleteMany({ where: { email: passwordReset.email } });

    return NextResponse.json({ message: "Password reset successfully." });
  } catch {
    return NextResponse.json(
      { error: "An error occurred while resetting your password." },
      { status: 500 },
    );
  }
}
