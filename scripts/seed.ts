
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create demo super admin account
  const superAdminPassword = await bcrypt.hash('johndoe123', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      password: superAdminPassword,
      name: 'John Doe',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log('Super admin created:', superAdmin.email);

  // Create demo tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { subdomain: 'demo' },
    update: {},
    create: {
      name: 'Demo Guest House',
      subdomain: 'demo',
      description: 'A beautiful demo guest house for testing purposes',
      logo: 'https://i.pinimg.com/736x/89/a0/8d/89a08dec058f38f0c8b1067d773aea41.jpg',
      theme: {
        primaryColor: '#14B8A6',
        secondaryColor: '#0F766E',
        logoUrl: null,
        fontFamily: 'Inter',
        borderRadius: '8px',
      },
      settings: {
        currency: 'USD',
        timezone: 'UTC',
        language: 'en',
      },
      plan: 'professional',
      status: 'ACTIVE',
    },
  });

  console.log('Demo tenant created:', demoTenant.name);

  // Create demo property
  const demoProperty = await prisma.property.upsert({
    where: { id: 'demo-property-1' },
    update: {},
    create: {
      id: 'demo-property-1',
      tenantId: demoTenant.id,
      name: 'Serenity Mountain Lodge',
      description: 'A peaceful retreat nestled in the mountains with stunning views and comfortable accommodations.',
      address: '123 Mountain View Drive',
      city: 'Aspen',
      state: 'Colorado',
      country: 'USA',
      zipCode: '81611',
      phone: '+1 (555) 123-4567',
      email: 'info@serenitylodge.com',
      website: 'https://serenitylodge.com',
      checkInTime: '15:00',
      checkOutTime: '11:00',
      currency: 'USD',
      timezone: 'America/Denver',
      images: [
        'https://i.ytimg.com/vi/zqU9g-bWAfc/maxresdefault.jpg',
        'https://reisetopia.de/wp-content/uploads/2022/11/Teton-Mountain-Lodge-Jackson-Hole-Zimmer-1024x576.png',
        'https://i.ytimg.com/vi/J7DevTZ7s2Q/maxresdefault.jpg',
      ],
      amenities: [
        'Free Wi-Fi',
        'Parking',
        'Restaurant',
        'Spa',
        'Fitness Center',
        'Pet Friendly',
        'Concierge Service',
        'Airport Shuttle',
      ],
      policies: {
        cancellation: 'Free cancellation up to 24 hours before check-in',
        children: 'Children of all ages are welcome',
        pets: 'Pets are welcome with additional fee',
        smoking: 'Non-smoking property',
      },
      isActive: true,
    },
  });

  console.log('Demo property created:', demoProperty.name);

  // Create demo tenant admin
  const tenantAdminPassword = await bcrypt.hash('admin123', 12);
  const tenantAdmin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      password: tenantAdminPassword,
      name: 'Demo Admin',
      role: 'TENANT_ADMIN',
      tenantId: demoTenant.id,
      isActive: true,
    },
  });

  // Create staff profile for tenant admin
  await prisma.staffProfile.upsert({
    where: { userId: tenantAdmin.id },
    update: {},
    create: {
      userId: tenantAdmin.id,
      tenantId: demoTenant.id,
      employeeId: 'EMP001',
      department: 'Management',
      position: 'General Manager',
      permissions: ['read', 'write', 'delete', 'manage_staff', 'manage_settings'],
      salary: 75000,
      hireDate: new Date('2024-01-01'),
      isActive: true,
    },
  });

  console.log('Tenant admin created:', tenantAdmin.email);

  // Create demo guest
  const guestPassword = await bcrypt.hash('guest123', 12);
  const demoGuest = await prisma.user.upsert({
    where: { email: 'guest@example.com' },
    update: {},
    create: {
      email: 'guest@example.com',
      password: guestPassword,
      name: 'Demo Guest',
      role: 'GUEST',
      tenantId: demoTenant.id,
      isActive: true,
    },
  });

  // Create guest profile
  await prisma.guestProfile.upsert({
    where: { userId: demoGuest.id },
    update: {},
    create: {
      userId: demoGuest.id,
      firstName: 'Demo',
      lastName: 'Guest',
      phone: '+1 (555) 987-6543',
      nationality: 'American',
      preferences: {
        roomType: 'Standard',
        bedType: 'Queen',
        smokingPreference: 'Non-smoking',
        dietaryRestrictions: 'None',
      },
      loyaltyTier: 'STANDARD',
      totalStays: 0,
    },
  });

  console.log('Demo guest created:', demoGuest.email);

  // Create demo staff members
  const staffMembers = [
    {
      email: 'frontdesk@demo.com',
      name: 'Sarah Johnson',
      role: 'FRONT_DESK',
      department: 'Front Office',
      position: 'Front Desk Manager',
      permissions: ['read', 'write', 'manage_bookings', 'manage_guests'],
    },
    {
      email: 'housekeeping@demo.com',
      name: 'Maria Rodriguez',
      role: 'HOUSEKEEPING',
      department: 'Housekeeping',
      position: 'Housekeeping Supervisor',
      permissions: ['read', 'write', 'manage_housekeeping'],
    },
    {
      email: 'maintenance@demo.com',
      name: 'David Wilson',
      role: 'MAINTENANCE',
      department: 'Maintenance',
      position: 'Maintenance Manager',
      permissions: ['read', 'write', 'manage_maintenance'],
    },
  ];

  for (const staff of staffMembers) {
    const staffPassword = await bcrypt.hash('staff123', 12);
    const staffUser = await prisma.user.upsert({
      where: { email: staff.email },
      update: {},
      create: {
        email: staff.email,
        password: staffPassword,
        name: staff.name,
        role: staff.role as any,
        tenantId: demoTenant.id,
        isActive: true,
      },
    });

    await prisma.staffProfile.upsert({
      where: { userId: staffUser.id },
      update: {},
      create: {
        userId: staffUser.id,
        tenantId: demoTenant.id,
        employeeId: `EMP${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        department: staff.department,
        position: staff.position,
        permissions: staff.permissions,
        salary: 45000,
        hireDate: new Date('2024-01-15'),
        isActive: true,
      },
    });

    console.log(`Staff member created: ${staff.email}`);
  }

  // Create demo rooms
  const roomTypes = [
    {
      type: 'STANDARD',
      name: 'Standard Room',
      basePrice: 150,
      capacity: 2,
      description: 'Comfortable room with mountain views and modern amenities',
      amenities: ['Free Wi-Fi', 'Air Conditioning', 'Coffee Maker', 'Flat-screen TV'],
      images: ['https://assets.hyatt.com/content/dam/hyatt/hyattdam/images/2022/10/13/0450/JAIZM-P0009-King-Room-View.jpg/JAIZM-P0009-King-Room-View.16x9.jpg?imwidth=1280'],
    },
    {
      type: 'DELUXE',
      name: 'Deluxe Room',
      basePrice: 220,
      capacity: 2,
      description: 'Spacious room with premium amenities and balcony',
      amenities: ['Free Wi-Fi', 'Air Conditioning', 'Coffee Maker', 'Flat-screen TV', 'Balcony', 'Mini Bar'],
      images: ['https://www.hotel-mountview.com/images/uploads/507/2882_939slider__2_.png'],
    },
    {
      type: 'SUITE',
      name: 'Mountain Suite',
      basePrice: 350,
      capacity: 4,
      description: 'Luxurious suite with separate living area and panoramic mountain views',
      amenities: ['Free Wi-Fi', 'Air Conditioning', 'Coffee Maker', 'Flat-screen TV', 'Balcony', 'Mini Bar', 'Separate Living Area', 'Fireplace'],
      images: ['https://thumbs.dreamstime.com/b/unforgettable-mountain-views-experience-panoramic-luxury-our-stunning-hotel-suites-escape-to-haven-breathtaking-beauty-354029201.jpg'],
    },
  ];

  for (let i = 1; i <= 20; i++) {
    const roomType = roomTypes[i % roomTypes.length];
    await prisma.room.upsert({
      where: { tenantId_propertyId_number: { tenantId: demoTenant.id, propertyId: demoProperty.id, number: String(i).padStart(3, '0') } },
      update: {},
      create: {
        tenantId: demoTenant.id,
        propertyId: demoProperty.id,
        number: String(i).padStart(3, '0'),
        name: `${roomType.name} ${String(i).padStart(3, '0')}`,
        type: roomType.type as any,
        description: roomType.description,
        capacity: roomType.capacity,
        basePrice: roomType.basePrice + (Math.random() * 50 - 25), // Add some price variation
        images: roomType.images,
        amenities: roomType.amenities,
        size: 300 + Math.floor(Math.random() * 200),
        bedType: i % 2 === 0 ? 'Queen' : 'King',
        status: i <= 15 ? 'AVAILABLE' : (i <= 18 ? 'OCCUPIED' : 'CLEANING'),
        isActive: true,
      },
    });
  }

  console.log('Demo rooms created: 20 rooms');

  // Create demo bookings
  const today = new Date();
  const bookings = [
    {
      checkInDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
      checkOutDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
      status: 'CONFIRMED',
      roomNumber: '001',
    },
    {
      checkInDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
      checkOutDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days
      status: 'CONFIRMED',
      roomNumber: '002',
    },
    {
      checkInDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // Yesterday
      checkOutDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days
      status: 'CHECKED_IN',
      roomNumber: '016',
    },
  ];

  for (const booking of bookings) {
    const room = await prisma.room.findFirst({
      where: {
        tenantId: demoTenant.id,
        propertyId: demoProperty.id,
        number: booking.roomNumber,
      },
    });

    if (room) {
      const nights = Math.ceil((booking.checkOutDate.getTime() - booking.checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalAmount = room.basePrice * nights;

      await prisma.booking.create({
        data: {
          tenantId: demoTenant.id,
          propertyId: demoProperty.id,
          roomId: room.id,
          guestId: demoGuest.id,
          confirmationNumber: `CONF${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate,
          adults: 2,
          children: 0,
          totalAmount,
          paidAmount: booking.status === 'CONFIRMED' ? totalAmount : 0,
          status: booking.status as any,
          source: 'direct',
          notes: 'Demo booking for testing purposes',
        },
      });
    }
  }

  console.log('Demo bookings created');

  // Create demo services
  const services = [
    {
      name: 'Airport Shuttle',
      description: 'Convenient airport transportation service',
      category: 'Transportation',
      price: 25,
      duration: 45,
    },
    {
      name: 'Spa Treatment',
      description: 'Relaxing spa treatment with mountain views',
      category: 'Wellness',
      price: 120,
      duration: 90,
    },
    {
      name: 'Room Service',
      description: 'In-room dining service',
      category: 'Food & Beverage',
      price: 15,
      duration: 30,
    },
    {
      name: 'Laundry Service',
      description: 'Professional laundry and dry cleaning',
      category: 'Housekeeping',
      price: 20,
      duration: 240,
    },
  ];

  for (const service of services) {
    await prisma.service.create({
      data: {
        tenantId: demoTenant.id,
        name: service.name,
        description: service.description,
        category: service.category,
        price: service.price,
        duration: service.duration,
        isActive: true,
        images: [`https://i.ytimg.com/vi/OAqH6gzgi6Y/maxresdefault.jpg service at luxury hotel:16:9}`],
        availability: {
          monday: { start: '08:00', end: '22:00' },
          tuesday: { start: '08:00', end: '22:00' },
          wednesday: { start: '08:00', end: '22:00' },
          thursday: { start: '08:00', end: '22:00' },
          friday: { start: '08:00', end: '22:00' },
          saturday: { start: '08:00', end: '22:00' },
          sunday: { start: '08:00', end: '22:00' },
        },
      },
    });
  }

  console.log('Demo services created');

  // Create demo housekeeping tasks
  const housekeepingStaff = await prisma.user.findFirst({
    where: { role: 'HOUSEKEEPING', tenantId: demoTenant.id },
  });

  const rooms = await prisma.room.findMany({
    where: { tenantId: demoTenant.id },
    take: 5,
  });

  for (const room of rooms) {
    await prisma.housekeepingTask.create({
      data: {
        tenantId: demoTenant.id,
        roomId: room.id,
        assignedTo: housekeepingStaff?.id,
        taskType: 'CLEANING',
        priority: 'MEDIUM',
        description: `Daily cleaning for room ${room.number}`,
        checklist: {
          bedroom: [
            { item: 'Make bed', completed: false },
            { item: 'Vacuum carpet', completed: false },
            { item: 'Dust surfaces', completed: false },
          ],
          bathroom: [
            { item: 'Clean shower', completed: false },
            { item: 'Clean toilet', completed: false },
            { item: 'Restock amenities', completed: false },
          ],
        },
        status: 'PENDING',
        scheduledDate: new Date(today.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000),
        estimatedDuration: 45,
      },
    });
  }

  console.log('Demo housekeeping tasks created');

  // Create demo inventory items
  const inventoryItems = [
    { name: 'Bed Sheets', category: 'Linens', currentStock: 50, minStock: 20, maxStock: 100, unit: 'pieces', unitCost: 25 },
    { name: 'Bath Towels', category: 'Linens', currentStock: 30, minStock: 15, maxStock: 60, unit: 'pieces', unitCost: 15 },
    { name: 'Toilet Paper', category: 'Bathroom', currentStock: 100, minStock: 50, maxStock: 200, unit: 'rolls', unitCost: 1.5 },
    { name: 'Shampoo', category: 'Bathroom', currentStock: 25, minStock: 10, maxStock: 50, unit: 'bottles', unitCost: 8 },
    { name: 'Coffee Pods', category: 'Food & Beverage', currentStock: 200, minStock: 100, maxStock: 500, unit: 'pieces', unitCost: 0.75 },
    { name: 'Cleaning Supplies', category: 'Housekeeping', currentStock: 15, minStock: 10, maxStock: 30, unit: 'bottles', unitCost: 12 },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.create({
      data: {
        tenantId: demoTenant.id,
        name: item.name,
        category: item.category,
        currentStock: item.currentStock,
        minStock: item.minStock,
        maxStock: item.maxStock,
        unit: item.unit,
        unitCost: item.unitCost,
        supplier: 'Demo Supplier Co.',
        lastRestocked: new Date(today.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
    });
  }

  console.log('Demo inventory items created');

  console.log('Database seed completed successfully!');
  console.log('\nDemo accounts created:');
  console.log('Super Admin: john@doe.com / johndoe123');
  console.log('Tenant Admin: admin@demo.com / admin123');
  console.log('Guest: guest@example.com / guest123');
  console.log('Staff: frontdesk@demo.com / staff123');
  console.log('Staff: housekeeping@demo.com / staff123');
  console.log('Staff: maintenance@demo.com / staff123');
  console.log('\nDemo tenant: demo.serenity-saas.com');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
