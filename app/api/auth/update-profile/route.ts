import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateProfileSchema } from "@/lib/validations/auth";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateProfileRequestSchema = updateProfileSchema.extend({
  avatar: z.string().nullable().optional(),
});

export async function PUT(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = updateProfileRequestSchema.safeParse(body);

    if (!parsed.success) {
      const message = Object.values(parsed.error.flatten().fieldErrors)
        .flat()
        .join(", ");

      return NextResponse.json({ error: message }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        bio: parsed.data.bio ?? null,
        phone: parsed.data.phone ?? null,
        ...(parsed.data.avatar
          ? {
              avatar: parsed.data.avatar,
              image: parsed.data.avatar,
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        image: true,
        bio: true,
        phone: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "That email address is already in use." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "An error occurred while updating your profile." },
      { status: 500 },
    );
  }
}
