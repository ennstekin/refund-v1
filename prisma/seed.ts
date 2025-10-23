import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Örnek merchant ID (gerçek kullanım için merchant ID'nizi kullanın)
  const merchantId = 'f5c91d2e-18cd-44e9-90bd-689be8f7ebd2';

  // Test iade kayıtları
  const refunds = [
    {
      orderId: 'order-test-001',
      orderNumber: 'TEST-2024-1001',
      merchantId,
      status: 'pending',
      reason: 'damaged_product',
      reasonNote: 'Ürün hasarlı geldi, kutu ezik',
      trackingNumber: null,
    },
    {
      orderId: 'order-test-002',
      orderNumber: 'TEST-2024-1002',
      merchantId,
      status: 'processing',
      reason: 'wrong_size',
      reasonNote: 'Yanlış beden geldi',
      trackingNumber: 'DHL987654321TR',
    },
    {
      orderId: 'order-test-003',
      orderNumber: 'TEST-2024-1003',
      merchantId,
      status: 'completed',
      reason: 'changed_mind',
      reasonNote: null,
      trackingNumber: 'DHL123456789TR',
    },
    {
      orderId: 'order-test-004',
      orderNumber: 'TEST-2024-1004',
      merchantId,
      status: 'pending',
      reason: 'defective',
      reasonNote: 'Ürün çalışmıyor',
      trackingNumber: null,
    },
    {
      orderId: 'order-test-005',
      orderNumber: 'TEST-2024-1005',
      merchantId,
      status: 'rejected',
      reason: 'late_delivery',
      reasonNote: 'İade süresi geçti',
      trackingNumber: null,
    },
  ];

  // İade kayıtlarını oluştur
  for (const refund of refunds) {
    const created = await prisma.refundRequest.create({
      data: refund,
    });

    console.log(`✓ İade oluşturuldu: ${created.orderNumber}`);

    // Her iade için notlar ekle
    if (refund.status === 'processing') {
      await prisma.refundNote.create({
        data: {
          refundRequestId: created.id,
          content: 'Müşteri ile görüşüldü, kargo bilgileri alındı',
          createdBy: 'Operasyon Ekibi',
        },
      });

      await prisma.refundTimeline.create({
        data: {
          refundRequestId: created.id,
          eventType: 'status_changed',
          eventData: JSON.stringify({ from: 'pending', to: 'processing' }),
          description: 'İade durumu "İşleniyor" olarak güncellendi',
          createdBy: 'Operasyon Ekibi',
        },
      });
    }

    if (refund.status === 'completed') {
      await prisma.refundNote.create({
        data: {
          refundRequestId: created.id,
          content: 'Ürün teslim alındı, iade işlemi tamamlandı',
          createdBy: 'Depo Ekibi',
        },
      });

      await prisma.refundTimeline.create({
        data: {
          refundRequestId: created.id,
          eventType: 'status_changed',
          eventData: JSON.stringify({ from: 'processing', to: 'completed' }),
          description: 'İade işlemi tamamlandı',
          createdBy: 'Sistem',
        },
      });
    }

    // Her iade için created eventi ekle
    await prisma.refundTimeline.create({
      data: {
        refundRequestId: created.id,
        eventType: 'created',
        eventData: JSON.stringify({ orderId: refund.orderId }),
        description: 'İade talebi oluşturuldu',
        createdBy: 'Müşteri',
      },
    });
  }

  console.log('✅ Seeding tamamlandı!');
  console.log(`📊 ${refunds.length} iade, notlar ve timeline kayıtları oluşturuldu`);
}

main()
  .catch((e) => {
    console.error('❌ Seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
