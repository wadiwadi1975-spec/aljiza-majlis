const {Pool}=require('pg');
const p=new Pool({connectionString:'postgresql://postgres.eicdioeyifyolwivglwx:WADI.WADI1975@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres',ssl:{rejectUnauthorized:false}});
async function check(){
  const tables=['users','departments','members','services','news','slider','settings'];
  for(const t of tables){
    const r=await p.query('SELECT count(*)::int AS n FROM '+t);
    console.log(t+': '+r.rows[0].n+' rows');
  }
  await p.end();
}
check().catch(e=>{console.error(e.message);p.end()});
