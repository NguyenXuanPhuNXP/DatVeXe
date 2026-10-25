const path = require('node:path');
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env'), quiet: true });
const { prisma } = require('../backend/src/lib/prisma');
const { createBookingService } = require('../backend/src/modules/bookings/bookings.service');

async function main() {
  const routes = await prisma.route.findMany();
  const route = routes.find(r => r.origin === 'Hà Nội' && r.destination === 'Đà Nẵng');
  const buses = await prisma.bus.findMany();
  if (!route || !buses.length) throw new Error('Run the base seed first');
  for (const [i, time] of ['07:00', '12:00', '21:00'].entries()) {
    const bus = buses[i % buses.length];
    if (!await prisma.trip.findFirst({where:{routeId:route.id, busId:bus.id, departureTime:time}})) {
      await prisma.trip.create({data:{routeId:route.id, busId:bus.id, companyId:bus.companyId, departureTime:time, arrivalTime:['21:00','02:00','11:00'][i], duration:'14h', price:[390000,420000,480000][i], isActive:true}});
    }
  }
  const trips = await prisma.trip.findMany({include:{route:true}});
  for (let i = 0; i < 16; i++) {
    const email = `demo.history.${i + 1}@example.com`;
    if (await prisma.booking.findFirst({where:{passengerEmail:email}})) continue;
    const date = new Date('2026-10-25T00:00:00Z');
    date.setUTCDate(date.getUTCDate() + i);
    const booking = await createBookingService({tripId:trips[i % trips.length].id,tripDate:date,seatCodes:['A1'],passengerName:`Khách Demo ${String(i+1).padStart(2,'0')}`,passengerPhone:'0900000000',passengerEmail:email,paymentMethod:'Tiền mặt khi lên xe'});
    const status = ['completed','confirmed','pending','cancelled'][i%4];
    const createdAt = new Date('2026-10-22T08:00:00Z');
    createdAt.setUTCDate(createdAt.getUTCDate() - i);
    await prisma.$transaction(async tx => {
      await tx.booking.update({where:{id:booking.id},data:{status,paymentStatus:i%4<2?'paid':'unpaid',createdAt}});
      await tx.ticket.updateMany({where:{bookingId:booking.id},data:{status}});
      if(status==='cancelled') await tx.seatStatus.updateMany({where:{bookingId:booking.id},data:{status:'available',bookingId:null,ticketId:null}});
    });
  }
  console.log(JSON.stringify({trips:await prisma.trip.count(),bookings:await prisma.booking.count(),tickets:await prisma.ticket.count()}));
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());
