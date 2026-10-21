const { prisma } = require("../../lib/prisma");
const { HttpError } = require("../../utils/http-error");

const busInclude = { company: true };

async function ensureCompanyExists(companyId) {
  const company = await prisma.busCompany.findUnique({
    where: { id: companyId },
    select: { id: true },
  });
  if (!company) {
    throw new HttpError(400, "INVALID_COMPANY", "Bus company not found");
  }
}

function listBuses() {
  return prisma.bus.findMany({
    include: busInclude,
    orderBy: { createdAt: "desc" },
  });
}

async function getBus(id) {
  const bus = await prisma.bus.findUnique({ where: { id }, include: busInclude });
  if (!bus) {
    throw new HttpError(404, "BUS_NOT_FOUND", "Bus not found");
  }
  return bus;
}

async function createBus(data) {
  await ensureCompanyExists(data.companyId);
  return prisma.bus.create({ data, include: busInclude });
}

async function updateBus(id, data) {
  if (data.companyId) {
    await ensureCompanyExists(data.companyId);
  }
  return prisma.bus.update({ where: { id }, data, include: busInclude });
}

async function deleteBus(id) {
  await prisma.bus.delete({ where: { id } });
  return { success: true };
}

module.exports = { listBuses, getBus, createBus, updateBus, deleteBus };