import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isOwner } from '@/lib/requireOwner';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: {
        id: true,
        name: true,
        description: true,
        logo: true,
        theme: true,
        subdomain: true,
        plan: true,
        amaldivesSlug: true,
        properties: {
          select: {
            id: true,
            name: true,
            description: true,
            address: true,
            city: true,
            country: true,
            phone: true,
            email: true,
            website: true,
            images: true,
            amenities: true,
            settings: true,
          },
          take: 1,
        },
      },
    });

    if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ tenant, property: tenant.properties[0] ?? null });
  } catch (error) {
    console.error('Web profile GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isOwner(session)) return NextResponse.json({ error: 'Forbidden — owner access required' }, { status: 403 });
    const tenantId = session.user.tenantId;

    const body = await request.json();
    const {
      tenantName, tenantDescription, tenantLogo,
      // Branding — stored in Tenant.theme JSON so it is whole-tenant
      // (sidebar + storefront read the same source). Each field is
      // optional; only provided keys are merged.
      primaryColor, accentColor, heroImageUrl, heroImageFocalPoint,
      propertyName, propertyDescription, propertyPhone, propertyEmail,
      propertyWebsite, propertyAddress, propertyCity, propertyCountry,
      amenities, images, tagline, highlights,
    } = body;

    // Update tenant
    const tenantUpdate: any = {};
    if (tenantName !== undefined) tenantUpdate.name = tenantName;
    if (tenantDescription !== undefined) tenantUpdate.description = tenantDescription;
    if (tenantLogo !== undefined) tenantUpdate.logo = tenantLogo;

    const themePatch: Record<string, unknown> = {};
    if (primaryColor !== undefined) themePatch.primaryColor = primaryColor;
    if (accentColor !== undefined) themePatch.accentColor = accentColor;
    if (heroImageUrl !== undefined) themePatch.heroImageUrl = heroImageUrl;
    if (heroImageFocalPoint !== undefined) themePatch.heroImageFocalPoint = heroImageFocalPoint;
    if (Object.keys(themePatch).length > 0) {
      const current = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { theme: true },
      });
      const existingTheme = (current?.theme as Record<string, unknown> | null) ?? {};
      tenantUpdate.theme = { ...existingTheme, ...themePatch };
    }

    if (Object.keys(tenantUpdate).length > 0) {
      await prisma.tenant.update({ where: { id: tenantId }, data: tenantUpdate });
    }

    // Update property
    const property = await prisma.property.findFirst({ where: { tenantId } });
    if (property) {
      const propertyUpdate: any = {};
      if (propertyName !== undefined) propertyUpdate.name = propertyName;
      if (propertyDescription !== undefined) propertyUpdate.description = propertyDescription;
      if (propertyPhone !== undefined) propertyUpdate.phone = propertyPhone;
      if (propertyEmail !== undefined) propertyUpdate.email = propertyEmail;
      if (propertyWebsite !== undefined) propertyUpdate.website = propertyWebsite;
      if (propertyAddress !== undefined) propertyUpdate.address = propertyAddress;
      if (propertyCity !== undefined) propertyUpdate.city = propertyCity;
      if (propertyCountry !== undefined) propertyUpdate.country = propertyCountry;
      if (amenities !== undefined) propertyUpdate.amenities = amenities;
      if (images !== undefined) propertyUpdate.images = images;

      // Store tagline and highlights in settings.webProfile
      const existingSettings = (property.settings as any) ?? {};
      propertyUpdate.settings = {
        ...existingSettings,
        webProfile: {
          ...(existingSettings.webProfile ?? {}),
          ...(tagline !== undefined ? { tagline } : {}),
          ...(highlights !== undefined ? { highlights } : {}),
        },
      };

      await prisma.property.update({ where: { id: property.id }, data: propertyUpdate });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Web profile PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
