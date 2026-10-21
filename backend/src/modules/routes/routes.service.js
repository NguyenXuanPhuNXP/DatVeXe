const { prisma } = require("../../lib/prisma");

async function getPopularRoutesService() {
  const routes = await prisma.route.findMany({
    take: 6,
    include: {
      trips: {
        where: { isActive: true },
        include: {
          company: true,
        },
      },
    },
  });

  return routes.map((r) => {
    const minPrice = r.trips.length > 0 ? Math.min(...r.trips.map((t) => t.price)) : 0;
    const topCompany = r.trips.length > 0 ? r.trips[0].company : null;
    return {
      id: r.id,
      origin: r.origin,
      destination: r.destination,
      minPrice,
      topCompany: topCompany ? topCompany.name : null,
      rating: topCompany ? topCompany.rating : null,
    };
  });
}

async function getCitiesService() {
  const routes = await prisma.route.findMany({
    select: {
      origin: true,
      destination: true,
    },
  });

  const cities = new Set();
  routes.forEach((r) => {
    cities.add(r.origin);
    cities.add(r.destination);
  });

  return Array.from(cities).sort();
}

module.exports = { getPopularRoutesService, getCitiesService };
