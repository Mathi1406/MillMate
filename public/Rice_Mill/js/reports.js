document.addEventListener('DOMContentLoaded',()=> {
  const M=window.MillMate;const $=id=>document.getElementById(id);let activeTab='salesPanel';let filtered= {
    bills:[],credits:[],repayments:[],units:[]
  };function getDate(r) {
    return r.dateOnly||M.dateISO(r.date);
  }
  function within(r) {
    const d=getDate(r);return (!$('fromDate').value||d>=$('fromDate').value)&&(!$('toDate').value||d<=$('toDate').value);
  }
  function matches(text) {
    return String(text||'').toLowerCase().includes($('reportSearch').value.trim().toLowerCase());
  }
  function rowEmpty(tbody,cols,msg='No records match the current filters.') {
    tbody.innerHTML=`<tr><td colspan="${cols}" class="empty">${msg}</td></tr>`;
  }
  function render() {
    const bills=M.getBills(),reps=M.getRepayments(),units=M.getUnits();filtered.bills=bills.filter(b=>within(b)&&matches(`${b.billNo} ${b.customer} ${(b.items||[]).map(i=>i.name).join(' ')}`));filtered.credits=bills.filter(b=>b.paymentMethod==='Credit'&&within(b)&&matches(`${b.billNo} ${b.customer}`));filtered.repayments=reps.filter(r=>within(r)&&matches(`${r.billNo} ${r.customer}`));filtered.units=units.filter(u=>within(u)&&matches(`${u.start} ${u.end} ${u.total}`));
    const billBody=$('reportBills');billBody.innerHTML='';if(!filtered.bills.length)rowEmpty(billBody,6);filtered.bills.slice().reverse().forEach(b=> {
      const tr=document.createElement('tr');tr.innerHTML=`<td>${b.billNo}</td><td>${new Date(b.date).toLocaleDateString()}</td><td>${M.escapeHtml(b.customer)}</td><td>${(b.items||[]).length}</td><td>${M.escapeHtml(b.paymentMethod)}</td><td>${M.money(b.total)}</td>`;billBody.appendChild(tr);
    });
    const creditBody=$('reportCredits');creditBody.innerHTML='';if(!filtered.credits.length)rowEmpty(creditBody,6);filtered.credits.slice().reverse().forEach(b=> {
      const paid=M.repaidForBill(b.billNo);const tr=document.createElement('tr');tr.innerHTML=`<td>${b.billNo}</td><td>${new Date(b.date).toLocaleDateString()}</td><td>${M.escapeHtml(b.customer)}</td><td>${M.money(b.total)}</td><td>${M.money(paid)}</td><td>${M.money(M.balanceForBill(b))}</td>`;creditBody.appendChild(tr);
    });
    const repBody=$('reportRepayments');repBody.innerHTML='';if(!filtered.repayments.length)rowEmpty(repBody,4);filtered.repayments.slice().reverse().forEach(r=> {
      const tr=document.createElement('tr');tr.innerHTML=`<td>${new Date(r.date).toLocaleString()}</td><td>${M.escapeHtml(r.customer)}</td><td>${r.billNo}</td><td>${M.money(r.amount)}</td>`;repBody.appendChild(tr);
    });
    const unitBody=$('reportUnits');unitBody.innerHTML='';if(!filtered.units.length)rowEmpty(unitBody,4);filtered.units.slice().reverse().forEach(u=> {
      const tr=document.createElement('tr');tr.innerHTML=`<td>${new Date(u.date).toLocaleDateString()}</td><td>${u.start}</td><td>${u.end}</td><td>${u.total}</td>`;unitBody.appendChild(tr);
    });renderQuality(bills);
  }
  function renderQuality(bills) {
    let duplicateNames=0,missingCustomer=0,invalidBills=0,missingItems=0;const seen=new Set();const issues=[];bills.forEach(b=> {
      const key=(b.customer||'').trim().toLowerCase();if(!key) {
        missingCustomer++;issues.push(['Bill #'+b.billNo,'Customer name missing','Verify the original bill before correcting.']);
      }
      if(key&&seen.has(key))duplicateNames++;if(key)seen.add(key);if(!Number.isFinite(Number(b.total))||Number(b.total)<0) {
        invalidBills++;issues.push(['Bill #'+b.billNo,'Invalid total','Compare with the saved item quantities and rates.']);
      }
      if(!Array.isArray(b.items)||!b.items.length) {
        missingItems++;issues.push(['Bill #'+b.billNo,'No item detail','Check whether the bill was saved correctly.']);
      }
      if((b.items||[]).some(i=>Number(i.quantity)<=0||Number(i.price)<0)) {
        issues.push(['Bill #'+b.billNo,'Invalid item quantity or price','Verify item data; do not silently change it.']);
      }

    });const metrics=[['Bills checked',bills.length],['Repeated customer names',duplicateNames],['Missing customer names',missingCustomer],['Invalid totals',invalidBills]];$('qualityMetrics').innerHTML=metrics.map(([l,v])=>`<article class="card"><p class="metric-label">${l}</p><p class="metric-value">${v}</p></article>`).join('');const body=$('qualityIssues');body.innerHTML='';if(!issues.length)rowEmpty(body,3,'No obvious issues found in the current local bill records.');issues.forEach(i=> {
      const tr=document.createElement('tr');tr.innerHTML=i.map(v=>`<td>${M.escapeHtml(v)}</td>`).join('');body.appendChild(tr);
    });
  }
  function currentRows() {
    if(activeTab==='salesPanel')return [['Bill no.','Date','Customer','Items','Payment','Total'],...filtered.bills.map(b=>[b.billNo,new Date(b.date).toISOString(),b.customer,(b.items||[]).map(i=>`${i.name} x${i.quantity}`).join('; '),b.paymentMethod,b.total])];if(activeTab==='creditPanel')return [['Bill no.','Date','Customer','Total','Repaid','Balance'],...filtered.credits.map(b=>[b.billNo,b.date,b.customer,b.total,M.repaidForBill(b.billNo),M.balanceForBill(b)])];if(activeTab==='unitsPanel')return [['Date','Start','End','Usage'],...filtered.units.map(u=>[u.date,u.start,u.end,u.total])];return [['Record','Issue','Suggested check'],...Array.from($('qualityIssues').querySelectorAll('tr')).filter(tr=>tr.cells.length===3&&!tr.querySelector('.empty')).map(tr=>Array.from(tr.cells).map(td=>td.innerText))];
  }
  document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=> {
    activeTab=btn.dataset.tab;document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===btn));document.querySelectorAll('.tab-panel').forEach(x=>x.classList.toggle('active',x.id===activeTab));
  }));$('applyFilters').addEventListener('click',render);$('resetFilters').addEventListener('click',()=> {
    $('reportSearch').value='';$('fromDate').value='';$('toDate').value='';render();
  });$('reportSearch').addEventListener('input',render);$('exportCurrent').addEventListener('click',()=>M.csvDownload(`millmate-${activeTab}-${M.dateISO()}.csv`,currentRows()));
  function parseCsv(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}else if(c==='"')quoted=true;else if(c===','){row.push(cell);cell='';}else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else cell+=c;}if(cell.length||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);}return rows.filter(r=>r.some(v=>String(v).trim()));}
  function importStatus(msg){$('importCsvStatus').hidden=false;$('importCsvStatus').textContent=msg;}
  $('importCsvBtn').addEventListener('click',()=>{if(activeTab!=='salesPanel'){importStatus('Please select Billing history tab before importing a MillMate billing CSV.');return;}$('importCsvFile').click();});
  $('importCsvFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const raw=(await file.text()).replace(/^\uFEFF/,'');const rows=parseCsv(raw);if(rows.length<2)throw new Error('CSV file has no data rows.');const headers=rows[0].map(h=>h.trim().toLowerCase());const required=['bill no.','date','customer','items','payment','total'];const idx=required.map(h=>headers.indexOf(h));if(idx.some(i=>i<0))throw new Error('Use a CSV exported from MillMate Billing history. Required columns: Bill no., Date, Customer, Items, Payment, Total.');const parsed=rows.slice(1).map((r,n)=>{const v=idx.map(i=>r[i]||'');const billNo=Number(v[0]),total=Number(v[5]);if(!Number.isFinite(billNo)||!v[2].trim()||!Number.isFinite(total)||total<0)throw new Error(`Invalid bill data on CSV row ${n+2}.`);const items=String(v[3]).split(';').map(part=>{const m=part.trim().match(/^(.*?)\s+x([0-9]+(?:\.[0-9]+)?)$/i);if(!m)return null;return {name:m[1].trim(),quantity:Number(m[2]),price:0,total:0};}).filter(Boolean);if(items.length){const q=items.reduce((a,x)=>a+x.quantity,0);items.forEach(x=>{x.total=total*x.quantity/q;x.price=x.total/x.quantity;});}return {id:M.uid('imported-bill'),billNo,customer:v[2].trim(),paymentMethod:v[4].trim()||'Cash',items,total,date:isNaN(Date.parse(v[1]))?new Date().toISOString():new Date(v[1]).toISOString(),dateOnly:M.dateISO(isNaN(Date.parse(v[1]))?new Date():new Date(v[1])),status:(v[4].trim()==='Credit'?'Credit':'Paid'),imported:true};});const existing=M.getBills();const known=new Set(existing.map(b=>String(b.billNo)));const fresh=parsed.filter(b=>!known.has(String(b.billNo)));const preview=fresh.slice(0,5).map(b=>`#${b.billNo} ${b.customer} ₹${b.total.toFixed(2)}`).join('\n');if(!fresh.length){importStatus('No new bills to import. All bill numbers already exist.');return;}if(!confirm(`Preview (${Math.min(5,fresh.length)} of ${fresh.length} new bills):\n${preview}\n\nImport ${fresh.length} bill records into MillMate?`))return;M.setBills(existing.concat(fresh));render();importStatus(`Imported ${fresh.length} bills. Existing bill numbers were skipped. Imported records are now included in Reports & Analytics.`);}catch(err){importStatus(err.message||'Could not import this CSV.');}finally{e.target.value='';}});render();
});
