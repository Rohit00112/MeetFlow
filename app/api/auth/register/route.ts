import { createFallbackAvatarUrl } from "@/lib/avatar";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const registerRequestSchema = z.object({
  name: z.string().trim().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().trim().email({ message: "Enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  avatar: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerRequestSchema.safeParse(body);

    if (!parsed.success) {
      const message = Object.values(parsed.error.flatten().fieldErrors)
        .flat()
        .join(", ");

      return NextResponse.json({ error: message }, { status: 400 });
    }

    const name = parsed.data.name;
    const email = parsed.data.email.toLowerCase();
    const password = await hashPassword(parsed.data.password);
    const image = parsed.data.avatar || createFallbackAvatarUrl(name);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password,
        avatar: image,
        image,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        image: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An account already exists for that email." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "An error occurred during registration." },
      { status: 500 },
    );
  }
}
