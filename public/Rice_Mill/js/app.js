(() => {
  const KEY = {
    products: 'millmate_products_v2',
    bills: 'millmate_bills_v2',
    repayments: 'millmate_repayments_v2',
    units: 'millmate_units_v2',
    settings: 'millmate_settings_v1'
  };
  const defaults = [
    {id:'p1',name:'Rice grinding',price:2},
    {id:'p2',name:'Ragi grinding',price:8},
    {id:'p3',name:'Wheat grinding',price:10},
    {id:'p4',name:'Corn grinding',price:5},
    {id:'p5',name:'Millet grinding',price:6},
    {id:'p6',name:'Spice grinding',price:20}
  ];
  function api(method, collection, data) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `/api/${collection}`, false);
    if (data !== undefined) xhr.setRequestHeader('Content-Type','application/json');
    try { xhr.send(data === undefined ? null : JSON.stringify(data)); }
    catch (_) { throw new Error('MillMate backend is not reachable. Start the server with npm start.'); }
    if (xhr.status < 200 || xhr.status >= 300) {
      let message = 'Database request failed.';
      try { message = JSON.parse(xhr.responseText).error || message; } catch (_) {}
      throw new Error(message);
    }
    return xhr.responseText ? JSON.parse(xhr.responseText) : {};
  }
  const productTamil = {
    'rice grinding':'அரிசி அரைத்தல்',
    'ragi grinding':'கேழ்வரகு அரைத்தல்',
    'wheat grinding':'கோதுமை அரைத்தல்',
    'corn grinding':'மக்காச்சோளம் அரைத்தல்',
    'millet grinding':'சிறுதானியங்கள் அரைத்தல்',
    'spice grinding':'மசாலா அரைத்தல்',
    'coconut oil':'தேங்காய் எண்ணெய்'
  };
  function productLabel(name) {
    const original = String(name || '');
    const tamil = productTamil[original.trim().toLowerCase()];
    return tamil ? `${original} (${tamil})` : original;
  }
  function money(value) {
    return '₹' + (Number(value)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  function uid(prefix='id') { return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7); }
  function dateISO(date=new Date()) {
    const d=new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function escapeHtml(value='') {
    return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function oldRead(key) {
    try { const v=JSON.parse(localStorage.getItem(key)); return Array.isArray(v)?v:[]; } catch (_) { return []; }
  }
  function getCollection(name) { return api('GET',name); }
  function setCollection(name, value) { api('PUT',name,value); }
  // First run only: if PostgreSQL is empty, move existing browser records to PostgreSQL.
  function initializeCollection(name, oldKey, transform = x => x) {
    let records = getCollection(name);
    if (!records.length) {
      let legacy = oldRead(oldKey);
      if (!legacy.length) legacy = oldRead(({products:'products',bills:'bills',repayments:'repayments',units:'units'})[name]);
      if (legacy.length) {
        records = legacy.map((x,i)=>transform(x,i));
        setCollection(name,records);
      }
    }
    return records;
  }
  function initialize() {
    initializeCollection('products',KEY.products,(p,i)=>({id:String(p.id||`legacy-prod-${i}`),name:String(p.name||p.productName||`Product ${i+1}`),price:Number(p.price||p.productPrice||0)}));
    initializeCollection('bills',KEY.bills,(b,i)=>({id:String(b.id||`legacy-bill-${i}`),billNo:b.billNo??1000+i,customer:String(b.customer||b.name||'Unknown customer'),paymentMethod:b.paymentMethod||'Cash',items:Array.isArray(b.items)?b.items:[],total:Number(b.total||b.amount||0),date:b.date||new Date().toISOString(),dateOnly:b.dateOnly||dateISO(b.date||new Date()),status:b.status||((b.paymentMethod==='Credit')?'Credit':'Paid')}));
    initializeCollection('repayments',KEY.repayments,(r,i)=>({id:String(r.id||`legacy-repayment-${i}`),billNo:r.billNo,customer:r.customer||'Unknown customer',amount:Number(r.amount||0),date:r.date||new Date().toISOString()}));
    initializeCollection('units',KEY.units,(u,i)=>({id:String(u.id||`legacy-unit-${i}`),date:u.date||new Date().toISOString(),dateOnly:u.dateOnly||dateISO(u.date||new Date()),start:Number(u.start||0),end:Number(u.end||0),total:Number(u.total||Math.max(0,Number(u.end||0)-Number(u.start||0)))}));
  }
  let initError = null;
  try { initialize(); } catch(e) { initError = e; console.error(e); }
  function getProducts(){let p=getCollection('products');if(!p.length){p=defaults.map(x=>({...x}));setCollection('products',p);}return p;}
  function setProducts(p){setCollection('products',p);}
  function getBills(){return getCollection('bills');}
  function setBills(b){setCollection('bills',b);}
  function getRepayments(){return getCollection('repayments');}
  function setRepayments(r){setCollection('repayments',r);}
  function getUnits(){return getCollection('units');}
  function setUnits(u){setCollection('units',u);}
  function getShopSettings(){const rows=getCollection('settings');return rows[0]||{id:'shop-profile',name:'',address:'',phone:'',gst:'',footer:'Thank you! Visit again.'};}
  function setShopSettings(s){setCollection('settings',[{id:'shop-profile',...s}]);}
  function repaidForBill(billNo){return getRepayments().filter(r=>String(r.billNo)===String(billNo)).reduce((s,r)=>s+Number(r.amount||0),0);}
  function balanceForBill(b){return Math.max(0,Number(b.total||0)-repaidForBill(b.billNo));}
  function navActive(){const file=location.pathname.split('/').pop()||'index.html';document.querySelectorAll('[data-nav]').forEach(a=>{if(a.dataset.nav===file)a.classList.add('active');});}
  function csvDownload(filename,rows){if(!rows||!rows.length){alert('No records to export.');return;}const csv=rows.map(row=>row.map(v=>{const s=String(v??'');return '"'+s.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);}
  window.MillMate={KEY,money,uid,dateISO,escapeHtml,productLabel,getProducts,setProducts,getBills,setBills,getRepayments,setRepayments,getUnits,setUnits,getShopSettings,setShopSettings,repaidForBill,balanceForBill,csvDownload,navActive,api,initError};
  document.addEventListener('DOMContentLoaded',()=>{
    navActive();
    if(initError) {
      const notice=document.createElement('div');notice.className='notice warning';
      notice.textContent='Database connection error. Start PostgreSQL and run the MillMate server. Details: '+initError.message;
      document.querySelector('main')?.prepend(notice);
    }
  });
})();
