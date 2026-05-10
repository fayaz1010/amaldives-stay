import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { authOptions } from '@/lib/auth';
import { randomUUID } from 'crypto';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/octet-stream'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB (pre-compression; canvas output will be much smaller)

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const files = formData.getAll('files') as File[];
  if (!files.length) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  const urls: string[] = [];
  const bucket = process.env.R2_BUCKET_NAME!;
  const publicBase = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed. Use JPEG, PNG, or WebP.` },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File ${file.name} exceeds 10 MB limit.` },
        { status: 400 },
      );
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const key = `stay/rooms/${session.user.tenantId}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        CacheControl: 'public, max-age=31536000',
      }),
    );

    urls.push(`${publicBase}/${key}`);
  }

  return NextResponse.json({ urls });
}
