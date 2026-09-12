const {Pool}=require('pg');
const p=new Pool({connectionString:'postgresql://postgres.eicdioeyifyolwivglwx:WADI.WADI1975@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres'});
p.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
.then(r=>{console.log(JSON.stringify(r.rows.map(x=>x.table_name)));p.end()})
.catch(e=>{console.error(e.message);p.end()});
