import { forgotPasswordSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      const message = Object.values(parsed.error.flatten().fieldErrors)
        .flat()
        .join(", ");

      return NextResponse.json({ error: message }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
      },
    });

    let resetLink: string | undefined;

    if (user?.password) {
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

      await prisma.passwordReset.deleteMany({ where: { email } });
      await prisma.passwordReset.create({
        data: {
          email,
          token,
          expiresAt,
        },
      });

      resetLink = `${request.nextUrl.origin}/auth/reset-password?token=${token}`;
    }

    return NextResponse.json({
      message: "If an account exists for that email, a reset link has been prepared.",
      ...(process.env.NODE_ENV !== "production" && resetLink ? { resetLink } : {}),
    });
  } catch {
    return NextResponse.json(
      { error: "An error occurred while preparing the reset link." },
      { status: 500 },
    );
  }
}
