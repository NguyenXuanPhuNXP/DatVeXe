require("dotenv/config");
const { app } = require("./app");
const { env } = require("./config/env");
const { prisma } = require("./lib/prisma");

const server = app.listen(env.PORT, () => {
  console.log(`DatVeXe API listening on port ${env.PORT}`);
});

const {expireUnpaidBookings}=require('./modules/ticketing/expiry.service');
const {processTicketEmails}=require('./modules/ticketing/email.service');
function runWorker(task,interval){
 let working=false;
 async function tick(){if(working)return;working=true;try{await task();}catch(error){console.error('Ticket worker failed:',error.code||error.name);}finally{working=false;}}
 void tick();const timer=setInterval(()=>void tick(),interval);timer.unref();return timer;
}
// A slow SMTP server must not delay seat expiry.
const expiryWorker=runWorker(expireUnpaidBookings,5000);
const emailWorker=runWorker(processTicketEmails,10000);
async function shutdown() {
  clearInterval(expiryWorker);
  clearInterval(emailWorker);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
