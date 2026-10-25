const fs=require('node:fs');
const path=require('node:path');
require('../backend/node_modules/dotenv').config({path:path.join(__dirname,'../backend/.env'),quiet:true});
const {prisma}=require('../backend/src/lib/prisma');
const xlsx=require('../backend/node_modules/xlsx');
const checks=[];
const assert=(condition,name,detail)=>{checks.push({name,passed:!!condition,detail});if(!condition)console.error('FAIL',name,detail)};
const api='http://localhost:3000';
async function req(url,options={}){const response=await fetch(api+url,options);const text=await response.text();let body;try{body=JSON.parse(text)}catch{body=text}return {status:response.status,body}}
const json=(body,token)=>({method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
async function main(){
 const health=await req('/health');assert(health.status===200,'API health');
 const forbidden=await req('/api/admin/dashboard');assert(forbidden.status===401,'Admin requires authentication');
 const login=await req('/api/auth/login',json({email:'admin@rightway.com',password:'Admin@123'}));assert(login.status===200,'Admin login');const token=login.body.accessToken;
 for(const url of ['dashboard','trips','routes','companies','bookings','promotions','news','users','reports']){const r=await req('/api/admin/'+url,{headers:{Authorization:'Bearer '+token}});assert(r.status===200,'Admin API '+url,Array.isArray(r.body)?r.body.length:undefined)}
 const query=new URLSearchParams({origin:'Hà Nội',destination:'Đà Nẵng',date:'2026-10-24'});
 const found=await req('/api/trips/search?'+query);assert(found.status===200&&found.body.length>=3,'Search returns demo route',found.body.length);
 const filtered=await req('/api/trips/search?'+query+'&departurePeriods=evening');assert(filtered.status===200&&filtered.body.length>0&&filtered.body.every(t=>t.departureTime>='18:00'),'Evening filter');
 const record=JSON.parse(fs.readFileSync(path.join(__dirname,'recording-result.json'),'utf8'));const booking=await prisma.booking.findUnique({where:{id:record.booking.id},include:{tickets:true,seatStatuses:true}});
 assert(booking.status==='confirmed','Recorded booking approved',booking.bookingCode);
 assert(booking.tickets.length===2&&booking.seatStatuses.length===2,'Two tickets and two seat claims persisted');
 assert(booking.tickets.reduce((s,t)=>s+t.price,0)===booking.totalPrice,'Ticket prices equal booking total');
 const duplicate={tripId:booking.tripId,tripDate:booking.tripDate.toISOString().slice(0,10),seatCodes:booking.tickets.map(t=>t.seatCode),passengerName:'Demo kiểm tra trùng ghế',passengerPhone:'0900000000',passengerEmail:'demo.conflict@example.com',paymentMethod:'Tiền mặt khi lên xe'};
 const conflict=await req('/api/bookings',json(duplicate));assert(conflict.status===409,'Already booked seats rejected with 409');
 const lookup=await req('/api/bookings/lookup?'+new URLSearchParams({bookingCode:booking.bookingCode,phone:booking.passengerPhone}));assert(lookup.status===200&&lookup.body.status==='confirmed','Lookup returns persisted approved status');
 const payload={...duplicate,tripDate:'2026-11-30',seatCodes:['C13'],passengerEmail:'demo.cancel.'+Date.now()+'@example.com'};
 const created=await req('/api/bookings',json(payload));assert(created.status===201||created.status===200,'Create separate cancellation test booking');
 if(created.body.id){const cancelled=await req('/api/bookings/'+created.body.id+'/cancel',{...json({phone:'0900000000'}),method:'PATCH'});assert(cancelled.status===200&&cancelled.body.status==='cancelled','Customer cancellation');const tickets=await prisma.ticket.findMany({where:{bookingId:created.body.id}});const seats=await prisma.seatStatus.findMany({where:{tripId:payload.tripId,tripDate:new Date(payload.tripDate),seatCode:'C13'}});assert(tickets.every(t=>t.status==='cancelled')&&seats.every(s=>s.status==='available'),'Cancellation updates tickets and releases seats');}
 const workbook=xlsx.readFile(path.join(__dirname,'Bao-cao-demo.xlsx'));assert(workbook.SheetNames.length>0,'Exported Excel workbook readable',workbook.SheetNames);
 const issues=[];
 if(booking.tickets.some(t=>t.status!==booking.status))issues.push('Admin approval updates Booking but leaves Ticket status pending.');
 fs.writeFileSync(path.join(__dirname,'check-results.json'),JSON.stringify({checks,issues,recordingErrors:record.errors},null,2));console.log(JSON.stringify({passed:checks.filter(c=>c.passed).length,total:checks.length,issues},null,2));if(checks.some(c=>!c.passed))process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());
